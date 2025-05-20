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
import { tmpdir } from 'os';
import fs from 'fs/promises';
import { spawn } from 'child_process';
import { escapeLit, getName } from '../../util/string.js';
class Data {
    constructor() {
        this.waifes = [];
        this.waifemap = {};
        this.lastwaifedate = '';
        this.waife_ids = {};
        this.iduserMap = {};
    }
}
/**
 * 将一个字符串转义为HTLML安全的
 * @param str 待转化成html安全的字符串
 * @returns
 */
function htmlify(str) {
    if (!str) {
        str = '';
    }
    str = str.replaceAll('&', '&amp;');
    str = str.replaceAll('<', '&lt;');
    str = str.replaceAll('>', '&gt;');
    str = str.replaceAll('"', '&quot;');
    return str;
}
/**
 * 将uid对应的人加入waife卡池
 * @param app
 * @param msg
 * @param uid UserId
 * @returns
 */
async function add_to_wife(app, chat, msg, uid) {
    if (!uid) {
        return;
    }
    if (chat.waife_ids[uid]) {
        return;
    }
    let you;
    if (msg.from?.id !== uid) {
        you = (await app.bot.getChatMember(msg.chat.id, uid)).user;
    }
    else {
        you = msg.from;
    }
    chat.waife_ids[uid] = true;
    chat.waifes.push(you);
    chat.iduserMap[uid] = you;
}
/**
 * Initialize and get Waifes List
 */
async function getWaifesList(app, chat, msg) {
    if (chat.waifes.length === 0) {
        const defaultWaifes = await app.bot.getChatAdministrators(msg.chat.id);
        console.log(defaultWaifes);
        for (const waife of defaultWaifes) {
            chat.waifes.push(waife.user);
            chat.waife_ids[waife.user.id];
            chat.iduserMap[waife.user.id] = waife.user;
        }
        await add_to_wife(app, chat, msg, msg.from?.id);
    }
    return chat.waifes;
}
/**
 * 获取老婆！
 * @param app
 * @param msg
 * @returns
 */
async function getWaife(app, msg) {
    const env_1 = { stack: [], error: void 0, hasError: false };
    try {
        if (!msg.from?.id) {
            return;
        }
        const waifedb = __addDisposableResource(env_1, await app.db.db('waife'), true);
        const chat = waifedb.data[msg.chat.id];
        if (new Date().toDateString() !== chat.lastwaifedate) {
            chat.waifemap = {};
            chat.lastwaifedate = new Date().toDateString();
        }
        if (chat.waifemap[msg.from?.id]) {
            void app.bot.sendMessage(msg.chat.id, '你今天已经抽过老婆了哦！', {
                reply_to_message_id: msg.message_id,
            });
            return;
        }
        const lst = await getWaifesList(app, chat, msg);
        if (lst.length <= 1) {
            void app.bot.sendMessage(msg.chat.id, '抱歉，我还没从群里获取到足够多的人哦，请先回复我一些消息', {
                reply_to_message_id: msg.message_id,
            });
            return;
        }
        let waife = lst[Math.floor(Math.random() * lst.length)];
        let cnt = 0;
        while (waife.id === msg.from?.id && cnt < 20) {
            waife = lst[Math.floor(Math.random() * lst.length)];
            cnt++;
        }
        if (waife.id === msg.from?.id) {
            void app.bot.sendMessage(msg.chat.id, '获取失败……理论上不会出现这个情况, 请查看bot代码', {
                reply_to_message_id: msg.message_id,
            });
            return;
        }
        const res = await app.bot.sendMessage(msg.chat.id, `${htmlify('获取成功~ 你今天的群友老婆是')} <a href="tg://user?id=${waife.id}">${htmlify(getName(waife))}</a>`, {
            parse_mode: 'HTML',
            reply_to_message_id: msg.message_id,
        });
        chat.waifemap[msg.from?.id] = { date: res.date, waife };
        await add_to_wife(app, chat, msg, msg.from.id);
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
async function renderGraph(id, src) {
    const [fname, outname] = [`${tmpdir()}/${id}.gv`, `${tmpdir()}/${id}.png`];
    await fs.writeFile(fname, src, { encoding: 'utf8' });
    await new Promise((res, rej) => {
        const proc = spawn('dot', [fname, '-Tpng', '-o', outname]);
        proc.on('close', (code) => (code === 0 ? res(void 0) : rej(code)));
    });
    return await fs.readFile(outname);
}
async function getWaifeGraph(app, msg) {
    if (!msg.from?.id) {
        return;
    }
    const waifedb = await app.db.db('waife');
    const chat = waifedb.peek[msg.chat.id];
    const wfMap = chat.waifemap;
    if (Object.keys(wfMap).length <= 0) {
        void app.bot.sendMessage(msg.chat.id, '群里还没人有老婆哦！', {
            reply_to_message_id: msg.message_id,
        });
        return;
    }
    const iduser = chat.iduserMap;
    const getNode = (user) => `${user.id}[label="${escapeLit(getName(user))}"]`;
    const uidMap = {};
    const txt = [];
    for (const id in wfMap) {
        if (wfMap[id]?.waife) {
            txt.push(`${id} -> ${wfMap[id]?.waife?.id}`);
            if (!uidMap[id]) {
                txt.push(`${getNode(iduser[id])};`);
                uidMap[id] = true;
            }
            if (!uidMap[wfMap[id]?.waife?.id]) {
                txt.push(`${getNode(wfMap[id]?.waife)};`);
                uidMap[wfMap[id]?.waife.id] = true;
            }
        }
    }
    const src = 'digraph G {\n' + 'node[shape=box];\n' + txt.join('\n') + '\n}';
    console.log(src);
    const qidao = app.bot.sendMessage(msg.chat.id, '少女祈祷中', {
        reply_to_message_id: msg.message_id,
    });
    try {
        const rendered = await renderGraph('waife', src);
        void app.bot.sendPhoto(msg.chat.id, rendered, {
            reply_to_message_id: msg.message_id,
        });
        void app.bot.deleteMessage(msg.chat.id, (await qidao).message_id);
    }
    catch (err) {
        void app.bot.sendMessage(msg.chat.id, `诶呀，生成图片中出现了错误…… ${JSON.stringify(err)}`, {
            reply_to_message_id: msg.message_id,
        });
        void app.bot.deleteMessage(msg.chat.id, (await qidao).message_id);
    }
}
const init = (app) => {
    app.db.register('waife', { data: () => new Data() });
    app.registCommand({
        chat_type: ['group', 'supergroup'],
        command: 'waife',
        handle: getWaife,
        description: '获取老婆！',
    });
    app.registCommand({
        chat_type: ['group', 'supergroup'],
        command: 'waife_graph',
        handle: getWaifeGraph,
        description: '获取老婆关系图！',
    });
    app.registReplyHandle({
        chat_type: ['group', 'supergroup'],
        handle: async (appl, msg) => {
            const env_2 = { stack: [], error: void 0, hasError: false };
            try {
                const db = __addDisposableResource(env_2, await app.db.db('waife'), true);
                await add_to_wife(appl, db.data[msg.chat.id], msg, msg.from?.id);
            }
            catch (e_2) {
                env_2.error = e_2;
                env_2.hasError = true;
            }
            finally {
                const result_2 = __disposeResources(env_2);
                if (result_2)
                    await result_2;
            }
        },
        description: '添加老婆！',
    });
};
export { init };
//# sourceMappingURL=index.js.map