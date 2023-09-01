import { Message } from "node-telegram-bot-api";
import { MessageHandleConfig, commandHandleFunction, handleFunction } from "../../lib/command.js";
import db from "../../lib/db.js";
import { PluginInit } from "../../types/plugin.js";
import { cy as _cy, cylist as _cylist, py as _py } from "./lib_loader.js";

const cy: {[key: string]: {st?: string, ed?: string}} = _cy // 成语词典
const cylist: {[key: string]: string[]} = _cylist  // 首拼音对应的成语
const py: string[] = _py  // 所有可能的成语开局

const jielongDefaultStatus = {
  started: false, // 是否已开始接龙
  st: 'long', // 现在的龙尾
  stcy: 'long', // 现在的龙尾（成语）
  counted: {}, // 已经接龙的词语列表
  lastJielonger: "", // 上一个接龙的userid
  combo: 0, // 连击数
  userStatus: {
    id: {
      username: "",
      score: 0,
      combo: 0,
    },
  }, // 用户得分信息
  startAt: 19260817 // 开始时间
}

function gameEnded(msg: Message): boolean {
  if (db.chat(msg.chat.id).jielong_status?.started) {
    if (typeof db.chat(msg.chat.id).jielong_status.startAt !== 'number') {
      return true;
    } else {
      return Number(new Date) - db.chat(msg.chat.id).jielong_status.startAt > 600000;
    }
  } else {
    return true;
  }
}
// 从starter获取随机成语开局
function setRandomChenyu(msg: Message, starter?: string): string {
  console.log(starter);
  if (starter === "" || starter === undefined || cylist[starter] === undefined) {
    return setRandomChenyu(msg, py[Math.floor(Math.random() * py.length)]);
  } else {
      const find:string = cylist[starter][Math.floor(Math.random() * cylist[starter].length)];
      if (!db.chat(msg.chat.id).jielong_status) {
        db.chat(msg.chat.id).jielong_status = {};
      }
      db.chat(msg.chat.id).jielong_status.counted[find] = true;
      db.chat(msg.chat.id).jielong_status.st = cy[find].ed;
      db.chat(msg.chat.id).jielong_status.stcy = find;

      return find;
  }
}
function getName(message: Message): string {
  let username:string = message.from?.first_name ?
    message.from?.first_name : (message.from?.username ? message.from?.username : '');
  if (message.from?.last_name) {
    username += ' ' + message.from?.last_name;
  }
  return username;
}
function getJielongStatus(msg: Message):string {
  if (db.chat(msg.chat.id).jielong_status?.started) {
    let res:string = '';
    const userStatus = db.chat(msg.chat.id).jielong_status.userStatus;

    function numToChinese(n: number):string | number {
      if (n <= 10) {
          return "零一二三四五六七八九十"[n];
      } else {
          return n;
      }
    }
    const uList = [];
    for (const uid in userStatus) {
      uList.push(userStatus[uid]);
    }
    uList.sort((a, b) => b.score - a.score);
    for (let i = 0; i < uList.length; i++) {
        res += `\n第${numToChinese(i + 1)}名: @${uList[i].username} ${uList[i].score}分，最多连击${uList[i].combo}次`;
    }
    return res;
  } else {
    return '接龙未开始！';
  }
}

const startJielong: commandHandleFunction = (app, msg, starter) => {
  if (db.chat(msg.chat.id).jielong_status?.started) {
    app.bot?.sendMessage(msg.chat.id, 
`现在正在游戏哦，上一个成语是 ${db.chat(msg.chat.id).jielong_status.stcy}，请接：${db.chat(msg.chat.id).jielong_status.st}
场上情况：${getJielongStatus(msg)}`
    );
  } else {
    if (starter?.length && starter?.length >= 3) {
      if (cy[starter] === undefined) {
        app.bot?.sendMessage(msg.chat.id, 
          `这个成语是什么，${app.config?.bot_name}不知道哦OoO`
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
        userStatus: {
        }, // 用户得分信息
        startAt: Number(new Date) // 开始时间
      };
      app.bot?.sendMessage(msg.chat.id, 
        `游戏开始！请接 ${db.chat(msg.chat.id).jielong_status?.st}`
      );
    } else {
      db.chat(msg.chat.id).jielong_status = {
        started: true,
        counted: {},
        lastJielonger: msg.from?.id,
        combo: 0, // 连击数
        userStatus: {
        }, // 用户得分信息
        startAt: Number(new Date) // 开始时间
      };
      setRandomChenyu(msg);
      app.bot?.sendMessage(msg.chat.id, 
        `游戏开始，${app.config?.bot_name}来给出第一个成语吧：${db.chat(msg.chat.id).jielong_status?.stcy}，请接 ${db.chat(msg.chat.id).jielong_status?.st}`
      );
    }
  }
}

const stopJielong: commandHandleFunction = (app, msg) => {
  if (db.chat(msg.chat.id).jielong_status?.started) {
    try {
      db.chat(msg.chat.id).jielong_status = {
        started: false,
      }
    } catch (err) {
      console.error(err);
    }

    app.bot?.sendMessage(msg.chat.id, `接龙被 @${msg.from?.username} 结束!\n最终情况：${getJielongStatus(msg)}`);
  } else {
    app.bot?.sendMessage(msg.chat.id, `接龙还未开始哦`);
  }
}

const newMessageHandle:handleFunction = (app, msg) => {
  if (db.chat(msg.chat.id).jielong_status?.started && msg.text && cy[msg.text]) {
    if (gameEnded(msg)) {
      let res:string = `成语接龙结束啦！${app.config?.bot_name}来宣布结果：${getJielongStatus(msg)}`;
      app.bot?.sendMessage(msg.chat.id, res);
      db.chat(msg.chat.id).jielong_status = {};
      return;
    }
    if (db.chat(msg.chat.id).jielong_status.st !== cy[msg.text].st) {
      return;
    }
    if (db.chat(msg.chat.id).jielong_status.counted[msg.text]) {
      app.bot?.sendMessage(msg.chat.id, `这个成语接过了哦`);
    } else {
      // 接龙成功
      db.chat(msg.chat.id).jielong_status.counted[msg.text] = true;
      db.chat(msg.chat.id).jielong_status.st = cy[msg.text].ed;
      db.chat(msg.chat.id).jielong_status.stcy = msg.text;
      if (!db.chat(msg.chat.id).jielong_status.userStatus) {
        db.chat(msg.chat.id).jielong_status.userStatus = {};
      }
      if (!db.chat(msg.chat.id).jielong_status.userStatus[msg.from?.id]) {
        db.chat(msg.chat.id).jielong_status.userStatus[msg.from?.id] = {
          uid: msg.from?.id,
          username: msg.from?.username,
          score: 1,
          combo: 1,
        }
      }
      db.chat(msg.chat.id).jielong_status.userStatus[msg.from?.id].score ++;
      // 判断combo
      if (!db.chat(msg.chat.id).jielong_status.combo) {
        db.chat(msg.chat.id).jielong_status.combo = 0;
      }
      if (db.chat(msg.chat.id).jielong_status.lastJielonger === msg.from?.id) {
        db.chat(msg.chat.id).jielong_status.combo++;
      } else {
        db.chat(msg.chat.id).jielong_status.userStatus[db.chat(msg.chat.id).jielong_status.lastJielonger].combo = Math.max(db.chat(msg.chat.id).jielong_status.userStatus[db.chat(msg.chat.id).jielong_status.lastJielonger].combo, db.chat(msg.chat.id).jielong_status.combo);
        db.chat(msg.chat.id).jielong_status.combo = 1;
        db.chat(msg.chat.id).jielong_status.lastJielonger = msg.from?.id;     
      }

      if (db.chat(msg.chat.id).jielong_status.combo <= 2) {
        app.bot?.sendMessage(msg.chat.id, `接龙成功！${getName(msg)} 分数+1。\n下一个开头：${db.chat(msg.chat.id).jielong_status.st}`);
      } else {
        app.bot?.sendMessage(msg.chat.id, `${getName(msg)} ${db.chat(msg.chat.id).jielong_status.combo} 连击！\n下一个开头：${db.chat(msg.chat.id).jielong_status.st}`);
      }
    }
  }
}

const init: PluginInit = (app) => {
  console.log('成语 loaded!');
  app.registCommand({
    chat_type: 'all',
    command: 'start_jielong',
    description: '开始一场成语接龙比赛！',
    handle: startJielong
  });
  app.registCommand({
    chat_type: 'all',
    command: 'stop_jielong',
    description: '强制结束现有的成语接龙',
    handle: stopJielong
  });
  app.registGlobalMessageHandle({
    chat_type: 'all',
    handle: newMessageHandle,
    description: '成语接龙: 用于便利的获得所说成语。'
  })
}

export { init };