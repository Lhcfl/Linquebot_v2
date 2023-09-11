import path from 'path';
import fs from './lock_fs.js';
import { DeepReadonly, MaybePromise } from '@/util/types.js';

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
  read(name: string): MaybePromise<{ [key: string | number]: unknown }>;
  /** Write to the path */
  write(name: string, data: { [key: string | number]: unknown }): MaybePromise<void>;
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
  occupied: Set<string | number>;
  sub?: { [key: string | number]: DBCache };
};
type DBRegistry = {
  init: (() => unknown)[];
  cache: DBCache;
};

/**
 * Manager and entry to the databases.
 *
 * **Note**: if you want to write to a database, don't forget to `using` it,
 * or data written to the database would lose!
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
 * await using grpdb = await app.db.db<{ id: number, users: User[] }>('groups');
 * const grp = grpdb.data[msg.group.id];
 * grp.id;
 * await using usrdb = await grpdb.sub<string>(msg.group.id);
 * const usr = usrdb.data[msg.user.id];
 * ```
 *
 * Accessing the same entry concurrently may result in losing data, or conflict between two transactions;
 * here, we choose to copy the entry lazily per database, which is not right, but lock-free,
 * and wouldn't cause any transactions to fail.
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
        const ctnt = (await fs.read(tr(fname))).toString('utf8');
        if (ctnt.trim() === '') return {};
        else return JSON.parse(ctnt) as { [k: string | number]: unknown };
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
    this.registry[name] = { init: [], cache: { occupied: new Set() } };
    if (init instanceof Array) this.registry[name].init = init;
    else {
      let it: DBInitializer | undefined = init;
      while (it) {
        this.registry[name].init.push(it.data);
        it = it.sub;
      }
    }
  }

  /**
   * Get the database of the name.
   *
   * For detailed document, see [`DBManager`]().
   */
  // Yes, yes, there's nothing that can silently act as any object
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  async db<T = any>(name: string): Promise<DB<T>> {
    if (!(name in this.registry)) throw new Error(`Unregistered database: ${name}`);
    const reg = this.registry[name];
    const fname = fnameescape(name);
    if (reg.cache.data === undefined) reg.cache.data = await this.storage.read(fname);
    return new DB(0, reg.init, reg.cache, this.storage, fname);
  }

  /**
   * Conveniently perform a transaction with the given entry in given path.
   * Equivalent to a chain of calls like:
   *
   * ``` typescript
   * // convenient call
   * await mgr.with_path<T>(['main', 'sub', ..., 'final sub', 'key'],
   *   async (val) => { 'do sth' });
   * // equivalent to:
   * await using subdb = await mgr.db('main').sub('sub')....sub<T>('final sub');
   * const val = subdb.data['key'];
   * // do sth
   * ```
   *
   * You may return a new value in the transaction to set the entry to the given value.
   */
  async with_path<T>(
    base: (string | number)[],
    transaction: (a: T) => Promise<void> | void
  ): Promise<void>;
  async with_path<T>(base: (string | number)[], transaction: (a: T) => Promise<T> | T): Promise<T>;
  async with_path<T>(
    base: (string | number)[],
    transaction: (a: T) => Promise<void | T> | void | T
  ): Promise<void | T> {
    if (base.length <= 2) throw new Error('with_path should be called with a path longer than 2');
    let db: DB<T> = { sub: (k) => this.db(k.toString()) } as DB<T>;
    for (const name of base.slice(0, -2)) db = await db.sub(name);
    await using subdb = await db.sub<T>(base[base.length - 2]);
    const key = base[base.length - 1];
    const data = await transaction(subdb.data[key]);
    if (data) {
      subdb.data[key] = data;
    }
    return data;
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
class DB<T> implements AsyncDisposable {
  private depth: number;
  private init: (() => T)[];
  private cache: DBCache;
  private storage: DBStorage;
  private base: string;
  private ctnt;

  /**
   * Entries in the database that can be read or written.
   *
   * Would raise warnings when concurrent read is detected, this is to prevent any possible pitfalls and bugs.
   * If you don't need to write into the database, use [`peek`]().
   */
  data: { [k: string | number]: T };

  /**
   * Readonly entries in the database.
   *
   * Can be safely accessed across transactions.
   *
   * If writing is needed, use [`data`]().
   */
  peek: DeepReadonly<{ [k: string | number]: T }>;

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
    const curinit = init[depth] as () => T;
    const cached = cache.data! as { [k: string | number]: T };
    this.ctnt = {};
    this.data = new Proxy<typeof this.data>(this.ctnt, {
      get(data, name: string) {
        if (!(name in data)) {
          if (cache.occupied.has(name)) {
            console.warn(
              `Database element ${name} in path ${base} is read while another transaction is using:` +
                'this may be errorneous and would result in data loss.'
            );
            console.trace();
          }
          cache.occupied.add(name);
          data[name] = name in cached ? cached[name] : curinit();
        }
        return data[name];
      },
    });
    this.peek = new Proxy<typeof this.peek>(this.ctnt, {
      get(data, name: string) {
        return name in data ? data[name] : cached[name] ?? curinit();
      },
    });
  }

  async [Symbol.asyncDispose](): Promise<void> {
    const data = this.cache.data!;
    // Yes, this may suppress further warnings, but one warning with one bug is severe enough and ought to be fixed.
    Object.keys(this.ctnt).forEach((k) => this.cache.occupied.delete(k));
    Object.assign(data, this.ctnt);
    await this.storage.write(this.base, data);
  }

  /**
   * Get the subdatabase in the database associated with the key.
   *
   * For detailed document, see [`DBManager`]().
   */
  async sub<U>(key: string | number): Promise<DB<U>> {
    if (this.cache.sub === undefined) this.cache.sub = {};
    const sub = this.cache.sub;
    const fname = path.join(this.base, fnameescape(key.toString()));
    if (sub[key] === undefined)
      sub[key] = { data: await this.storage.read(fname), occupied: new Set() };
    return new DB(this.depth + 1, this.init, sub[key], this.storage, fname);
  }
}
