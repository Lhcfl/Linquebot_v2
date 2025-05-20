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
import { cy as _cy, cylist as _cylist, py as _py } from './lib_loader.js';
import { getName } from '../../util/string.js';
const cy = _cy; // 成语词典
const cylist = _cylist; // 首拼音对应的成语
const py = _py; // 所有可能的成语开局
class jielongStatus {
    constructor() {
        /** 是否已开始接龙 */
        this.started = false;
        /** 已经接龙的词语Map 真值说明已经接过。 */
        this.counted = {};
    }
}
function getDefaultUserStatus(u) {
    return {
        uid: u?.id,
        username: u?.username || u?.first_name,
        score: 0,
        combo: 1,
    };
}
function gameEnded(data) {
    if (data.started) {
        const startAt = data.startAt;
        if (typeof startAt !== 'number') {
            return true;
        }
        else {
            return Number(new Date()) - startAt > 600000;
        }
    }
    else {
        return true;
    }
}
// 从starter获取随机成语开局
function setRandomChenyu(data, starter) {
    console.log(starter);
    if (starter === '' || starter === undefined || cylist[starter] === undefined) {
        return setRandomChenyu(data, py[Math.floor(Math.random() * py.length)]);
    }
    else {
        const find = cylist[starter][Math.floor(Math.random() * cylist[starter].length)];
        if (data.counted) {
            data.counted[find] = true;
        }
        else {
            const newDataCounted = {};
            newDataCounted[find] = true;
            data.counted = newDataCounted;
        }
        data.st = cy[find].ed;
        data.stcy = find;
        return find;
    }
}
function getJielongInfo(data) {
    function numToChinese(n) {
        if (n <= 10) {
            return '零一二三四五六七八九十'[n];
        }
        else {
            return n;
        }
    }
    if (data.started) {
        let res = '';
        const userStatus = data.userStatus;
        if (!userStatus) {
            return '无数据！';
        }
        const uList = [];
        for (const uid of Object.keys(userStatus)) {
            const us = userStatus[uid];
            if (us)
                uList.push(us);
        }
        uList.sort((a, b) => Number(b.score) - Number(a.score));
        for (let i = 0; i < uList.length; i++) {
            res += `\n第${numToChinese(i + 1)}名: @${uList[i].username} ${uList[i].score}分，最多连击${uList[i].combo}次`;
        }
        return res;
    }
    else {
        return '接龙未开始！';
    }
}
const startJielong = async (app, msg, starter) => {
    const env_1 = { stack: [], error: void 0, hasError: false };
    try {
        const db = __addDisposableResource(env_1, await app.db.db('chengyu'), true);
        const data = db.data[msg.chat.id];
        if (data.started) {
            void app.bot?.sendMessage(msg.chat.id, `现在正在游戏哦，上一个成语是 ${data.stcy}，请接：${data.st}\n场上情况：${getJielongInfo(data)}`);
        }
        else {
            if (starter?.length && starter?.length >= 3) {
                if (cy[starter] === undefined) {
                    void app.bot?.sendMessage(msg.chat.id, `这个成语是什么，${app.config?.bot_name}不知道哦OoO`);
                    return;
                }
                Object.assign(data, {
                    started: true,
                    st: cy[starter].ed,
                    stcy: starter,
                    counted: {},
                    lastJielonger: msg.from?.id,
                    combo: 0, // 连击数
                    userStatus: {}, // 用户得分信息
                    startAt: Number(new Date()), // 开始时间
                });
                void app.bot?.sendMessage(msg.chat.id, `游戏开始！请接 ${data.st}`);
            }
            else {
                Object.assign(data, {
                    started: true,
                    counted: {},
                    lastJielonger: msg.from?.id,
                    combo: 0, // 连击数
                    userStatus: {}, // 用户得分信息
                    startAt: Number(new Date()), // 开始时间
                });
                setRandomChenyu(data);
                void app.bot?.sendMessage(msg.chat.id, `游戏开始，${app.config?.bot_name}来给出第一个成语吧：${data.stcy}，请接 ${data.st}`);
            }
        }
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
};
const stopJielong = async (app, msg) => {
    const env_2 = { stack: [], error: void 0, hasError: false };
    try {
        const db = __addDisposableResource(env_2, await app.db.db('chengyu'), true);
        const data = db.data[msg.chat.id];
        if (data.started) {
            void app.bot?.sendMessage(msg.chat.id, `接龙被 @${msg.from?.username} 结束!\n最终情况：${getJielongInfo(data)}`);
            try {
                Object.assign(data, {
                    started: false,
                });
            }
            catch (err) {
                console.error(err);
            }
        }
        else {
            void app.bot?.sendMessage(msg.chat.id, '接龙还未开始哦');
        }
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
};
const newMessageHandle = async (app, msg) => {
    const env_3 = { stack: [], error: void 0, hasError: false };
    try {
        const db = __addDisposableResource(env_3, await app.db.db('chengyu'), true);
        const data = db.data[msg.chat.id];
        if (data.started && msg.text && cy[msg.text]) {
            if (gameEnded(data)) {
                const res = `成语接龙结束啦！${app.config?.bot_name}来宣布结果：${getJielongInfo(data)}`;
                void app.bot?.sendMessage(msg.chat.id, res);
                void app.db.with_path(['chengyu', msg.chat.id], () => { });
                return;
            }
            if (data.st !== cy[msg.text].st) {
                return;
            }
            if (data.counted && data.counted[msg.text]) {
                void app.bot?.sendMessage(msg.chat.id, '这个成语接过了哦');
            }
            else {
                if (!msg.from?.id) {
                    return;
                }
                // 接龙成功
                if (data.counted) {
                    data.counted[msg.text] = true;
                }
                else {
                    const newDataCounted = {};
                    newDataCounted[msg.text] = true;
                    data.counted = newDataCounted;
                }
                data.st = cy[msg.text].ed;
                data.stcy = msg.text;
                let userStatus = data.userStatus;
                if (!userStatus) {
                    data.userStatus = {};
                    userStatus = {};
                }
                const userStatusToUpdate = userStatus[msg.from?.id] || getDefaultUserStatus(msg.from);
                userStatusToUpdate.score = Number(userStatusToUpdate.score) + 1;
                userStatus[msg.from?.id] = userStatusToUpdate;
                // 判断combo
                if (!data.combo) {
                    data.combo = 0;
                }
                if (data.lastJielonger === msg.from?.id) {
                    data.combo = data.combo + 1;
                }
                else {
                    const lastJielonger = data.lastJielonger;
                    if (lastJielonger) {
                        const lastJielongerUserStatus = userStatus[lastJielonger] || {
                            uid: lastJielonger,
                            score: 0,
                            combo: 1,
                        };
                        lastJielongerUserStatus.combo = Math.max(lastJielongerUserStatus.combo ?? 0, data.combo);
                        userStatus[lastJielonger] = lastJielongerUserStatus;
                    }
                    data.combo = 1;
                    data.lastJielonger = msg.from?.id;
                }
                data.userStatus = userStatus;
                if (data.combo <= 2) {
                    void app.bot?.sendMessage(msg.chat.id, `接龙成功！${getName(msg?.from)} 分数+1。\n下一个开头：${data.st}`);
                }
                else {
                    void app.bot?.sendMessage(msg.chat.id, `${getName(msg?.from)} ${data.combo} 连击！\n下一个开头：${data.st}`);
                }
            }
        }
    }
    catch (e_3) {
        env_3.error = e_3;
        env_3.hasError = true;
    }
    finally {
        const result_3 = __disposeResources(env_3);
        if (result_3)
            await result_3;
    }
};
const init = (app) => {
    console.log('成语 loaded!');
    app.db.register('chengyu', [() => new jielongStatus()]);
    app.registCommand({
        chat_type: 'all',
        command: 'start_jielong',
        description: '开始一场成语接龙比赛！',
        handle: startJielong,
    });
    app.registCommand({
        chat_type: 'all',
        command: 'stop_jielong',
        description: '强制结束现有的成语接龙',
        handle: stopJielong,
    });
    app.registGlobalMessageHandle({
        chat_type: 'all',
        handle: newMessageHandle,
        description: '成语接龙: 用于便利的获得所说成语。',
    });
};
export { init };
//# sourceMappingURL=index.js.map