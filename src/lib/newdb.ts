import { readFile, writeFile } from 'fs/promises';
import path from 'path';

/**
 * A single database providing key-value entry access.
 *
 * Should be already locked when acquired, and should *NOT* escape from the lock ---
 * JS/TS syntax doesn't enforce this.
 */
export interface DBSection<T> extends AsyncDisposable {
  /** A proxy to the object stored in the db */
  data: { [key: number | string]: Promise<T> | T };
}

/**
 * A collection to key-value databases where values are located in different databases and indexed with an id,
 * providing exclusive access to the databases.
 *
 * Database and collection type is separated to allow flexible cascading between databases.
 * For a single database, see [DBSection<T>]().
 *
 * TODO: Add typings to allow generics be deduced from the database name.
 *
 * Example:
 *
 * ``` typescript
 * const db: DB;
 *
 * // Register a database with desired ID and type
 * type DBType = { name: string; rua: boolean };
 * await db.register('mydb', { name: 'qwq', rua: false });
 *
 * // Lock the db to access its content
 * await db.lock<DBType>('mydb').data.a; // => { name: 'qwq', rua: false }
 * await db.lock<DBType>('mydb').data.a.name = 'asdf';
 * await db.lock<DBType>('mydb').data.a; // => { name: 'asdf', rua: false }
 * await db.lock<DBType>('mydb').data.b; // => { name: 'qwq', rua: false }
 * ```
 */
export interface DBCollection {
  /**
   * Register a database with given name and default value.
   * The default value would be applied to every entry when it's accessed the first time.
   *
   * @param name name of the database, used for later access
   * @param init a function constructing the default value
   */
  register<T>(
    name: string,
    init: () => T,
    opts?: { kind: 'subcollection' | 'dataleaf' }
  ): Promise<void>;
  /**
   * Lock the whole database to access some/all entries in it.
   * The access is exclusive: the entries can't be read or modified during the execution of the transaction.
   *
   * All modifications to the entries would be automatically committed after the transaction ends,
   * i.e. after the database is disposed.
   * **There's no guarantee to the integrity: transactions may lose after a process kill.**
   *
   * @param name name of the database
   */
  lock<T>(name: string): Promise<DBSection<T>>;
  /**
   * Get the subcollection in the given database with the key.
   * Would not lock the database.
   *
   * @param name name of the database
   * @param key key of the subcollection
   */
  getsub(name: string, key: string | number): Promise<DBCollection | undefined>;
}

/**
 * Errors in all database operations
 */
export interface DBError {
  /** in which function the error occurred */
  location: keyof DBCollection | keyof DBSection<object>;
  /** the description of the error */
  description: string;
}

/**
 * Implements the
 */
export interface StorageDBStorage {
  read(fname: string): Promise<{ [k: string | number]: never }>;
  write(fname: string, data: { [k: string | number]: never }): Promise<void>;
}

/**
 * A storage-based database: each database has an independent file to store its data,
 * and the hierarchy of the databases are represented by directory hierarchy.
 */
export class StorageDB implements DBCollection {
  private static registry: {
    [k: string]: {
      ctnt?: { [k: string | number]: never };
      sub?: { [k: string | number]: StorageDB };
      init: () => unknown;
      locked: boolean;
      queue: [() => void, (e: DBError) => void][];
    };
  } = {};

  private storage;
  private path: string[] = [];

  /**
   * Construct the db with a base path and a storage implement.
   * At almost all time, both of the arguments can be omitted.
   *
   * By default, `base` would be empty, since there is a default storage path;
   * and `storage` would actually write to the file system.
   *
   * @param base path to the directory where database files are placed
   * @param storage the implement to the storage
   */
  constructor(base: string | string[] = [], storage?: StorageDBStorage) {
    this.storage = storage ?? {
      async read(fname) {
        return JSON.parse((await readFile(fname)).toString('utf8'));
      },
      async write(fname, data) {
        await writeFile(fname, JSON.stringify(data));
      },
    };
    this.path = typeof base === 'string' ? [base] : base;
  }

  private getsec(loc: string, name: string) {
    if (!(name in StorageDB.registry))
      throw {
        location: loc,
        description: `unregistered database: ${name}`,
      };
    const fname = encodeURI(`${name}.json`).replaceAll(
      /[\/*?:|"\<>]/g,
      (c) => `%-${'/*?:|"<>'.indexOf(c) + 1}`
    );
    return { fname: path.join('..', 'data', ...this.path, fname), sec: StorageDB.registry[name] };
  }

  async lock<T>(name: string): Promise<DBSection<T>> {
    const { fname, sec } = this.getsec('lock', name);
    if (sec.locked)
      await new Promise<void>((res, rej) => {
        sec.queue.push([res, rej]);
      });
    else sec.locked = true;
    if (sec.ctnt === undefined) sec.ctnt = await this.storage.read(fname);
    return new FileDBSection(sec.ctnt!, async (data) => {
      this.storage.write(fname, data);
      const proc = sec.queue.shift();
      if (proc === undefined) sec.locked = false;
      else proc[0]();
    });
  }

  async getsub(name: string, key: string | number): Promise<DBCollection | undefined> {
    const {
      fname,
      sec: { sub },
    } = this.getsec('lock', name);
    if (sub === undefined) return undefined;
    else if (key in sub) return sub[key];
    return (sub[key] = new StorageDB([...this.path, fname]));
  }

  async register<T>(
    name: string,
    init: () => T,
    opts?: { kind: 'subcollection' | 'dataleaf' }
  ): Promise<void> {
    if (name in StorageDB.registry) return;
    StorageDB.registry[name] = {
      sub: opts?.kind === 'subcollection' ? {} : undefined,
      init,
      locked: false,
      queue: [],
    };
  }
}

class FileDBSection<T> implements DBSection<T> {
  data;
  private waker;
  constructor(
    data: { [key: string | number]: T },
    waker: (ctnt: { [k: string | number]: T }) => Promise<void>
  ) {
    this.data = data;
    this.waker = waker;
  }
  async [Symbol.asyncDispose](): Promise<void> {
    await this.waker(this.data);
  }
}
