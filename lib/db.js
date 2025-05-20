var __addDisposableResource = (this && this.__addDisposableResource) || function (env, value, async) {
    if (value !== null && value !== void 0) {
        if (typeof value !== "object" && typeof value !== "function") throw new TypeError("Object expected.");
        var dispose, inner;
        if (async) {
            if (!Symbol.asyncDispose) throw new TypeError("Symbol.asyncDispose is not defined.");
            dispose = value[Symbol.asyncDispose];
        }
        if (dispose === void 0) {
            if (!Symbol.dispose) throw new TypeError("Symbol.dispose is not defined.");
            dispose = value[Symbol.dispose];
            if (async) inner = dispose;
        }
        if (typeof dispose !== "function") throw new TypeError("Object not disposable.");
        if (inner) dispose = function() { try { inner.call(this); } catch (e) { return Promise.reject(e); } };
        env.stack.push({ value: value, dispose: dispose, async: async });
    }
    else if (async) {
        env.stack.push({ async: true });
    }
    return value;
};
var __disposeResources = (this && this.__disposeResources) || (function (SuppressedError) {
    return function (env) {
        function fail(e) {
            env.error = env.hasError ? new SuppressedError(e, env.error, "An error was suppressed during disposal.") : e;
            env.hasError = true;
        }
        var r, s = 0;
        function next() {
            while (r = env.stack.pop()) {
                try {
                    if (!r.async && s === 1) return s = 0, env.stack.push(r), Promise.resolve().then(next);
                    if (r.dispose) {
                        var result = r.dispose.call(r.value);
                        if (r.async) return s |= 2, Promise.resolve(result).then(next, function(e) { fail(e); return next(); });
                    }
                    else s |= 1;
                }
                catch (e) {
                    fail(e);
                }
            }
            if (s === 1) return env.hasError ? Promise.reject(env.error) : Promise.resolve();
            if (env.hasError) throw env.error;
        }
        return next();
    };
})(typeof SuppressedError === "function" ? SuppressedError : function (error, suppressed, message) {
    var e = new Error(message);
    return e.name = "SuppressedError", e.error = error, e.suppressed = suppressed, e;
});
import path from 'path';
import fs from './lock_fs.js';
function fnameescape(name) {
    return name.replaceAll(/[\/*?:|"\\<>]/g, (c) => `%-${'/*?:|"\\<>'.indexOf(c) + 1}`);
}
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
    /**
     * You should **ONLY** do this in unit tests.
     *
     * Construct a manager with given storage implement.
     */
    constructor(storage) {
        const tr = (fname) => `../data/${fname}/data.json`;
        this.storage = storage ?? {
            async read(fname) {
                const ctnt = (await fs.read(tr(fname))).toString('utf8');
                if (ctnt.trim() === '')
                    return {};
                else
                    return JSON.parse(ctnt);
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
    register(name, init) {
        if (name in this.registry)
            return;
        this.registry[name] = { init: [], cache: { occupied: new Set() } };
        if (init instanceof Array)
            this.registry[name].init = init;
        else {
            let it = init;
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
    async db(name) {
        if (!(name in this.registry))
            throw new Error(`Unregistered database: ${name}`);
        const reg = this.registry[name];
        const fname = fnameescape(name);
        if (reg.cache.data === undefined)
            reg.cache.data = await this.storage.read(fname);
        return new DB(0, reg.init, reg.cache, this.storage, fname);
    }
    async get_subpath(base) {
        if (base.length < 2)
            throw new Error('with_path should be called with a path longer than 2');
        let db = { sub: (k) => this.db(k.toString()) };
        for (const name of base.slice(0, -2))
            db = await db.sub(name);
        return await db.sub(base[base.length - 2]);
    }
    /**
     * Conveniently transform data in the given entry in given path.
     * Equivalent to a chain of calls.
     *
     * See [`with_path`]() for more details or writes are needed.
     */
    async peek_path(base, transaction) {
        // No, we don't need to write back here x
        const subdb = await this.get_subpath(base);
        return await transaction(subdb.peek[base[base.length - 1]]);
    }
    async with_path(base, transaction) {
        const env_1 = { stack: [], error: void 0, hasError: false };
        try {
            const subdb = __addDisposableResource(env_1, await this.get_subpath(base), true);
            const key = base[base.length - 1];
            const data = await transaction(subdb.data[key]);
            if (data !== undefined)
                subdb.data[key] = data;
            return data;
        }
        catch (e_1) {
            env_1.error = e_1;
            env_1.hasError = true;
        }
        finally {
            const result_1 = __disposeResources(env_1);
            if (result_1)
                await result_1;
        }
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
class DB {
    constructor(depth, init, cache, storage, base) {
        this.depth = depth;
        this.init = init;
        this.base = base;
        this.cache = cache;
        this.storage = storage;
        const curinit = init[depth];
        const cached = cache.data;
        this.ctnt = {};
        this.data = new Proxy(this.ctnt, {
            get(data, name) {
                if (!(name in data)) {
                    if (cache.occupied.has(name)) {
                        console.warn(`Database element ${name} in path ${base} is read while another transaction is using:` +
                            'this may be errorneous and would result in data loss.');
                        console.trace();
                    }
                    cache.occupied.add(name);
                    data[name] = name in cached ? cached[name] : curinit();
                }
                return data[name];
            },
        });
        this.peek = new Proxy(this.ctnt, {
            get(data, name) {
                return name in data ? data[name] : (cached[name] ?? curinit());
            },
        });
    }
    async [Symbol.asyncDispose]() {
        const data = this.cache.data;
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
    async sub(key) {
        if (this.cache.sub === undefined)
            this.cache.sub = {};
        const sub = this.cache.sub;
        const fname = path.join(this.base, fnameescape(key.toString()));
        if (sub[key] === undefined)
            sub[key] = { data: await this.storage.read(fname), occupied: new Set() };
        return new DB(this.depth + 1, this.init, sub[key], this.storage, fname);
    }
}
//# sourceMappingURL=db.js.map