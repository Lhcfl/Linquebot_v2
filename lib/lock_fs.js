/**
 * Read or write a file with a lock and logs, to keep its integrity.
 * @module lock_fs
 */
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
import fs from 'fs/promises';
import path from 'path';
const lock = {};
async function readable(fname) {
    try {
        await fs.access(fname, fs.constants.R_OK);
        return true;
    }
    catch (e) {
        return false;
    }
}
class FileLock {
    static async get(fname) {
        if (!(fname in lock))
            lock[fname] = { locked: false, wakerq: [] };
        if (lock[fname].locked)
            await new Promise((res) => lock[fname].wakerq.push(res));
        else
            lock[fname].locked = true;
        return new FileLock(fname);
    }
    constructor(fname) {
        this.fname = fname;
    }
    [Symbol.dispose]() {
        const waker = lock[this.fname].wakerq.shift();
        if (waker)
            waker();
        else
            lock[this.fname].locked = false;
    }
}
/**
 * Read data from a file with locks and logs.
 *
 * Several backups and helper files used for logging are recognized,
 * should be used in pair with [`write`]().
 *
 * @param fname the name of the file
 * @returns data read from the file
 */
export async function read(fname) {
    const env_1 = { stack: [], error: void 0, hasError: false };
    try {
        // So why isn't there using expressions or using statement without variable name???
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        const _ = __addDisposableResource(env_1, await FileLock.get(fname), false);
        if (await readable(`${fname}-writing`)) {
            await fs.copyFile(`${fname}-backup`, fname);
            await fs.rm(`${fname}-writing`);
        }
        if (await readable(fname))
            return await fs.readFile(fname);
        else
            return Buffer.from('', 'utf8');
    }
    catch (e_1) {
        env_1.error = e_1;
        env_1.hasError = true;
    }
    finally {
        __disposeResources(env_1);
    }
}
/**
 * Write data to a file with locks and logs.
 *
 * Several backups and helper files used for logging are created,
 * should be used in pair with [`read`]().
 *
 * @param fname the name of the file
 * @param data the data to write to the file
 */
export async function write(fname, data) {
    const env_2 = { stack: [], error: void 0, hasError: false };
    try {
        // So why isn't there using expressions or using statement without variable name???
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        const _ = __addDisposableResource(env_2, await FileLock.get(fname), false);
        await fs.mkdir(path.dirname(fname), { recursive: true });
        if (await readable(fname))
            await fs.copyFile(fname, `${fname}-backup`);
        await fs.writeFile(`${fname}-writing`, '');
        await fs.writeFile(fname, data);
        await fs.rm(`${fname}-writing`, { force: true });
        await fs.rm(`${fname}-backup`, { force: true });
    }
    catch (e_2) {
        env_2.error = e_2;
        env_2.hasError = true;
    }
    finally {
        __disposeResources(env_2);
    }
}
export default { read, write };
//# sourceMappingURL=lock_fs.js.map