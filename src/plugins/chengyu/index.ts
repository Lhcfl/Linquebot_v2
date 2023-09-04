import { Message } from 'node-telegram-bot-api';
import { commandHandleFunction, handleFunction } from '../../lib/command.js';
import db from '../../lib/db.js';
import { PluginInit } from '../../types/plugin.js';
import { cy as _cy, cylist as _cylist, py as _py } from './lib_loader.js';

const cy: { [key: string]: { st?: string; ed?: string } } = _cy; // 成语词典
const cylist: { [key: string]: string[] } = _cylist; // 首拼音对应的成语
const py: string[] = _py; // 所有可能的成语开局

type userIdType = string | number;
interface jielongStatus {
  /** 是否已开始接龙 */
  started?: boolean;
  /** 下一个接龙开头拼音 */
  st?: string;
  /** 上一个被接龙的成语 */
  stcy?: string;
  /** 已经接龙的词语Map 真值说明已经接过。 */
  counted?: { [key: string]: number | boolean };
  /** 上一个接龙的userid */
  lastJielonger?: userIdType;
  /** 目前连击数 */
  combo?: number;
  /** 用户得分信息 */
  userStatus?: {
    [key: userIdType]: {
      username?: string;
      score?: number;
      combo?: number;
      uid?: number;
    };
  };
  /** 开始时间（转换为Number） */
  startAt?: number;
}

function getJielongStatus(msg: Message): jielongStatus {
  if (!db.chat(msg.chat.id).jielong_status) {
    db.chat(msg.chat.id).jielong_status = {};
  }
  return db.chat(msg.chat.id).jielong_status;
}
getJielongStatus.counted = (msg: Message) => {
  const counted = getJielongStatus(msg).counted;
  if (counted) {
    return counted;
  } else {
    getJielongStatus(msg).counted = {};
    return {};
  }
};
function clearJielongStatus(msg: Message): void {
  db.chat(msg.chat.id).jielong_status = {};
}

function gameEnded(msg: Message): boolean {
  if (getJielongStatus(msg)?.started) {
    const startAt = getJielongStatus(msg).startAt;
    if (typeof startAt !== 'number') {
      return true;
    } else {
      return Number(new Date()) - startAt > 600000;
    }
  } else {
    return true;
  }
}
// 从starter获取随机成语开局
function setRandomChenyu(msg: Message, starter?: string): string {
  console.log(starter);
  if (
    starter === '' ||
    starter === undefined ||
    cylist[starter] === undefined
  ) {
    return setRandomChenyu(msg, py[Math.floor(Math.random() * py.length)]);
  } else {
    const find: string =
      cylist[starter][Math.floor(Math.random() * cylist[starter].length)];
    if (!getJielongStatus(msg)) {
      clearJielongStatus(msg);
    }
    getJielongStatus.counted(msg)[find] = true;
    getJielongStatus(msg).st = cy[find].ed;
    getJielongStatus(msg).stcy = find;

    return find;
  }
}
function getName(message: Message): string {
  let username: string = message.from?.first_name
    ? message.from?.first_name
    : message.from?.username
      ? message.from?.username
      : '';
  if (message.from?.last_name) {
    username += ' ' + message.from?.last_name;
  }
  return username;
}
function getJielongInfo(msg: Message): string {
  function numToChinese(n: number): string | number {
    if (n <= 10) {
      return '零一二三四五六七八九十'[n];
    } else {
      return n;
    }
  }
  if (getJielongStatus(msg)?.started) {
    let res: string = '';
    const userStatus = getJielongStatus(msg).userStatus;
    if (!userStatus) {
      return '无数据！';
    }

    const uList = [];
    for (const uid of Object.keys(userStatus)) {
      uList.push(userStatus[uid]);
    }
    uList.sort((a, b) => Number(b.score) - Number(a.score));
    for (let i = 0; i < uList.length; i++) {
      res += `\n第${numToChinese(i + 1)}名: @${uList[i].username} ${
        uList[i].score
      }分，最多连击${uList[i].combo}次`;
    }
    return res;
  } else {
    return '接龙未开始！';
  }
}

const startJielong: commandHandleFunction = (app, msg, starter) => {
  if (getJielongStatus(msg)?.started) {
    app.bot?.sendMessage(
      msg.chat.id,
      `现在正在游戏哦，上一个成语是 ${getJielongStatus(msg).stcy}，请接：${
        getJielongStatus(msg).st
      }\n场上情况：${getJielongInfo(msg)}`,
    );
  } else {
    if (starter?.length && starter?.length >= 3) {
      if (cy[starter] === undefined) {
        app.bot?.sendMessage(
          msg.chat.id,
          `这个成语是什么，${app.config?.bot_name}不知道哦OoO`,
        );
        return;
      }
      db.chat(msg.chat.id).jielong_status = {
        started: true,
        st: cy[starter].ed,
        stcy: starter,
        counted: {},
        lastJielonger: msg.from?.id,
        combo: 0, // 连击数
        userStatus: {}, // 用户得分信息
        startAt: Number(new Date()), // 开始时间
      };
      app.bot?.sendMessage(
        msg.chat.id,
        `游戏开始！请接 ${getJielongStatus(msg)?.st}`,
      );
    } else {
      db.chat(msg.chat.id).jielong_status = {
        started: true,
        counted: {},
        lastJielonger: msg.from?.id,
        combo: 0, // 连击数
        userStatus: {}, // 用户得分信息
        startAt: Number(new Date()), // 开始时间
      };
      setRandomChenyu(msg);
      app.bot?.sendMessage(
        msg.chat.id,
        `游戏开始，${app.config
          ?.bot_name}来给出第一个成语吧：${getJielongStatus(msg)
          ?.stcy}，请接 ${getJielongStatus(msg)?.st}`,
      );
    }
  }
};

const stopJielong: commandHandleFunction = (app, msg) => {
  if (getJielongStatus(msg)?.started) {
    app.bot?.sendMessage(
      msg.chat.id,
      `接龙被 @${msg.from?.username} 结束!\n最终情况：${getJielongInfo(msg)}`,
    );
    try {
      db.chat(msg.chat.id).jielong_status = {
        started: false,
      };
    } catch (err) {
      console.error(err);
    }
  } else {
    app.bot?.sendMessage(msg.chat.id, '接龙还未开始哦');
  }
};

const newMessageHandle: handleFunction = (app, msg) => {
  if (getJielongStatus(msg)?.started && msg.text && cy[msg.text]) {
    if (gameEnded(msg)) {
      const res: string = `成语接龙结束啦！${app.config
        ?.bot_name}来宣布结果：${getJielongInfo(msg)}`;
      app.bot?.sendMessage(msg.chat.id, res);
      db.chat(msg.chat.id).jielong_status = {};
      return;
    }
    if (getJielongStatus(msg).st !== cy[msg.text].st) {
      return;
    }
    if (getJielongStatus.counted(msg)[msg.text]) {
      app.bot?.sendMessage(msg.chat.id, '这个成语接过了哦');
    } else {
      if (!msg.from?.id) {
        return;
      }
      // 接龙成功
      getJielongStatus.counted(msg)[msg.text] = true;
      getJielongStatus(msg).st = cy[msg.text].ed;
      getJielongStatus(msg).stcy = msg.text;
      let userStatus = getJielongStatus(msg).userStatus;
      if (!userStatus) {
        getJielongStatus(msg).userStatus = {};
        userStatus = {};
      }
      if (!userStatus[msg.from?.id]) {
        userStatus[msg.from?.id] = {
          uid: msg.from?.id,
          username: msg.from?.username,
          score: 0,
          combo: 1,
        };
      }
      userStatus[msg.from?.id].score =
        Number(userStatus[msg.from?.id].score) + 1;
      // 判断combo
      if (!getJielongStatus(msg).combo) {
        getJielongStatus(msg).combo = 0;
      }
      if (getJielongStatus(msg).lastJielonger === msg.from?.id) {
        getJielongStatus(msg).combo = Number(getJielongStatus(msg).combo) + 1;
      } else {
        const lastJielonger = getJielongStatus(msg).lastJielonger;
        if (lastJielonger) {
          userStatus[lastJielonger].combo = Math.max(
            Number(userStatus[lastJielonger].combo),
            Number(getJielongStatus(msg).combo),
          );
        }
        getJielongStatus(msg).combo = 1;
        getJielongStatus(msg).lastJielonger = msg.from?.id;
      }

      getJielongStatus(msg).userStatus = userStatus;

      if (Number(getJielongStatus(msg).combo) <= 2) {
        app.bot?.sendMessage(
          msg.chat.id,
          `接龙成功！${getName(msg)} 分数+1。\n下一个开头：${
            getJielongStatus(msg).st
          }`,
        );
      } else {
        app.bot?.sendMessage(
          msg.chat.id,
          `${getName(msg)} ${getJielongStatus(msg).combo} 连击！\n下一个开头：${
            getJielongStatus(msg).st
          }`,
        );
      }
    }
  }
};

const init: PluginInit = (app) => {
  console.log('成语 loaded!');
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
