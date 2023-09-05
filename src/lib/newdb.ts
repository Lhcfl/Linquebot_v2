import path from 'path';
import fs from './lock_fs';

/**
 * Store data in the database.
 *
 * **Usually this don't need to be implemented or even cared: hardcoded default values should be enough.**
 *
 * When implementing, note that any function may be called concurrently. Locks may be needed.
 * Paths can be used directly as filesystem paths,
 * where the main database name and the keys in the path to the subdatabase form the components in the path.
 * E.g. a subdatabase `main.10.circle` would be of path `main/10/circle`
 */
export interface DBStorage {
  /** Read from the path @returns the data in the database of the path */
  read(name: string): Promise<{ [key: string | number]: unknown }>;
  /** Write to the path */
  write(name: string, data: { [key: string | number]: unknown }): Promise<void>;
}

function fnameescape(name: string) {
  return name.replaceAll(/[\/*?:|"\\<>]/g, (c) => `%-${'/*?:|"\\<>'.indexOf(c) + 1}`);
}

/**
 * Initialize the entries of the database, and define the structure of the database.
 *
 * Yes, this can be replaced with a simple array; we just want to mark kinda structure (
 */
export interface DBInitializer {
  /** Returns the default value for an entry */
  data: () => unknown;
  /** Recursively define the initializer of the subdatabases */
  sub?: DBInitializer;
}

type DBCache = {
  data?: { [key: string | number]: unknown };
  sub?: { [key: string | number]: DBCache };
};
type DBRegistry = {
  init: (() => unknown)[];
  cache: DBCache;
};

/**
 * Manager and entry to the databases.
 *
 * You should **NOT** construct any of its instances, except for unit tests:
 * there's a app-local singleton [`app.db`]().
 *
 * Usage:
 *
 * ``` typescript
 * // register the database
 * db.register('groups', { data: () => { id: number, users: User[] }, sub: { data: () => string } });
 * // use the databases
 * using grpdb = await app.db.db<{ id: number, users: User[] }>('groups');
 * const grp = grpdb.data[msg.group.id];
 * grp.id;
 * using usrdb = await grpdb.sub<string>(msg.group.id);
 * const usr = usrdb.data[msg.user.id];
 * ```
 */
export class DBManager {
  private registry: {
    [name: string]: DBRegistry;
  };
  private storage: DBStorage;

  /**
   * You should **ONLY** do this in unit tests.
   *
   * Construct a manager with given storage implement.
   */
  constructor(storage?: DBStorage) {
    const tr = (fname: string) => `../data/${fname}/data.json`;
    this.storage = storage ?? {
      async read(fname) {
        return JSON.parse((await fs.read(tr(fname))).toString('utf8'));
      },
      async write(fname, data) {
        await fs.write(tr(fname), JSON.stringify(data));
      },
    };
    this.registry = {};
  }

  /**
   * Register a database.
   *
   * Note that the structure of the database can't be changed once it's registered.
   *
   * Reregistering is a no-op.
   *
   * @param name name of the database
   * @param init initializer of the database, can also be an array if the explicit initializer is too annoying...
   */
  register(name: string, init: DBInitializer | (() => unknown)[]) {
    if (name in this.registry) return;
    this.registry[name] = { init: [], cache: {} };
    if (init instanceof Array) this.registry[name].init = init;
    else {
      let it: DBInitializer | undefined = init;
      while (it) {
        this.registry[name].init.push(it.data);
        it = it.sub;
      }
    }
  }

  // Yes, yes, there's nothing that can silently act as a
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  async db<T = any>(name: string): Promise<DB<T>> {
    if (!(name in this.registry)) throw new Error(`Unregistered database: ${name}`);
    const reg = this.registry[name];
    const fname = fnameescape(name);
    if (reg.cache.data === undefined) reg.cache.data = await this.storage.read(fname);
    return new DB(0, reg.init, reg.cache, this.storage, fname);
  }
}

/**
 * A database created by [DBManager]().
 *
 * You should **NOT** construct this, and you should not have a chance to.
 * Retrieve the databases you want with [`DBManager.db()`]() and [`DB.sub()`]().
 *
 * Yes, explicit variable scope-based RAIIing is annoying, erroneous, and introducing overwhelming complexity,
 * and lacking proper lifetime management leads to impossibility of actually using DB as a value;
 * however the dumbness of JS design requires everything above, and refuses to simplify the world with type systems.
 */
class DB<T> implements Disposable {
  private depth: number;
  private init: (() => T)[];
  private cache: DBCache;
  private storage: DBStorage;
  private base: string;
  private modified;
  private ctnt;

  data;

  constructor(
    depth: number,
    init: (() => unknown)[],
    cache: DBCache,
    storage: DBStorage,
    base: string
  ) {
    this.depth = depth;
    this.init = init as (() => T)[];
    this.base = base;
    this.cache = cache;
    this.storage = storage;
    this.modified = new Set();
    const modified = this.modified;
    const curinit = init[depth] as () => T;
    if (cache.data === undefined) cache.data = {};
    const cached = cache.data as { [k: string | number]: T };
    this.ctnt = {};
    this.data = new Proxy<{ [k: string | number]: T }>(this.ctnt, {
      get(data, name: string) {
        modified.add(name);
        if (!(name in data)) data[name] = name in cached ? cached[name] : curinit();
        return data[name];
      },
    });
  }

  [Symbol.dispose](): void {
    const data = this.cache.data!;
    Object.assign(data, this.ctnt);
    this.storage.write(this.base, data);
  }

  /**
   * Get the subdatabase in the database associated with the key.
   */
  async sub<U>(key: string | number): Promise<DB<U>> {
    if (this.cache.sub === undefined) this.cache.sub = {};
    const sub = this.cache.sub;
    const fname = path.join(this.base, fnameescape(key.toString()));
    if (sub[key] === undefined) sub[key] = { data: await this.storage.read(fname) };
    return new DB(this.depth + 1, this.init, sub, this.storage, fname);
  }
}
