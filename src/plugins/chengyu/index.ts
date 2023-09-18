import { commandHandleFunction, handleFunction } from '../../lib/command.js';
import { PluginInit } from '../../types/plugin.js';
import { cy as _cy, cylist as _cylist, py as _py } from './lib_loader.js';
import { getName } from '@/util/string.js';

const cy: { [key: string]: { st?: string; ed?: string } } = _cy; // 成语词典
const cylist: { [key: string]: string[] } = _cylist; // 首拼音对应的成语
const py: string[] = _py; // 所有可能的成语开局

type userIdType = string | number;
class jielongStatus {
  /** 是否已开始接龙 */
  started: boolean = false;
  /** 下一个接龙开头拼音 */
  st?: string;
  /** 上一个被接龙的成语 */
  stcy?: string;
  /** 已经接龙的词语Map 真值说明已经接过。 */
  counted: { [key: string]: number | boolean } = {};
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

function gameEnded(data: jielongStatus): boolean {
  if (data.started) {
    const startAt = data.startAt;
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
function setRandomChenyu(data: jielongStatus, starter?: string): string {
  console.log(starter);
  if (starter === '' || starter === undefined || cylist[starter] === undefined) {
    return setRandomChenyu(data, py[Math.floor(Math.random() * py.length)]);
  } else {
    const find: string = cylist[starter][Math.floor(Math.random() * cylist[starter].length)];
    data.counted[find] = true;
    data.st = cy[find].ed;
    data.stcy = find;
    return find;
  }
}
function getJielongInfo(data: jielongStatus): string {
  function numToChinese(n: number): string | number {
    if (n <= 10) {
      return '零一二三四五六七八九十'[n];
    } else {
      return n;
    }
  }
  if (data.started) {
    let res: string = '';
    const userStatus = data.userStatus;
    if (!userStatus) {
      return '无数据！';
    }

    const uList = [];
    for (const uid of Object.keys(userStatus)) {
      uList.push(userStatus[uid]);
    }
    uList.sort((a, b) => Number(b.score) - Number(a.score));
    for (let i = 0; i < uList.length; i++) {
      res += `\n第${numToChinese(i + 1)}名: @${uList[i].username} ${uList[i].score}分，最多连击${
        uList[i].combo
      }次`;
    }
    return res;
  } else {
    return '接龙未开始！';
  }
}

const startJielong: commandHandleFunction = async (app, msg, starter) => {
  await using db = await app.db.db<jielongStatus>('chengyu');
  const data = db.data[msg.chat.id];
  if (data.started) {
    void app.bot?.sendMessage(
      msg.chat.id,
      `现在正在游戏哦，上一个成语是 ${data.stcy}，请接：${data.st}\n场上情况：${getJielongInfo(
        data
      )}`
    );
  } else {
    if (starter?.length && starter?.length >= 3) {
      if (cy[starter] === undefined) {
        void app.bot?.sendMessage(
          msg.chat.id,
          `这个成语是什么，${app.config?.bot_name}不知道哦OoO`
        );
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
    } else {
      Object.assign(data, {
        started: true,
        counted: {},
        lastJielonger: msg.from?.id,
        combo: 0, // 连击数
        userStatus: {}, // 用户得分信息
        startAt: Number(new Date()), // 开始时间
      });
      setRandomChenyu(data);
      void app.bot?.sendMessage(
        msg.chat.id,
        `游戏开始，${app.config?.bot_name}来给出第一个成语吧：${data.stcy}，请接 ${data.st}`
      );
    }
  }
};

const stopJielong: commandHandleFunction = async (app, msg) => {
  await using db = await app.db.db<jielongStatus>('chengyu');
  const data = db.data[msg.chat.id];
  if (data.started) {
    void app.bot?.sendMessage(
      msg.chat.id,
      `接龙被 @${msg.from?.username} 结束!\n最终情况：${getJielongInfo(data)}`
    );
    try {
      Object.assign(data, {
        started: false,
      });
    } catch (err) {
      console.error(err);
    }
  } else {
    void app.bot?.sendMessage(msg.chat.id, '接龙还未开始哦');
  }
};

const newMessageHandle: handleFunction = async (app, msg) => {
  await using db = await app.db.db<jielongStatus>('chengyu');
  const data = db.data[msg.chat.id];
  if (data.started && msg.text && cy[msg.text]) {
    if (gameEnded(data)) {
      const res: string = `成语接龙结束啦！${app.config?.bot_name}来宣布结果：${getJielongInfo(
        data
      )}`;
      void app.bot?.sendMessage(msg.chat.id, res);
      void app.db.with_path(['chengyu', msg.chat.id], () => {});
      return;
    }
    if (data.st !== cy[msg.text].st) {
      return;
    }
    if (data.counted[msg.text]) {
      void app.bot?.sendMessage(msg.chat.id, '这个成语接过了哦');
    } else {
      if (!msg.from?.id) {
        return;
      }
      // 接龙成功
      data.counted[msg.text] = true;
      data.st = cy[msg.text].ed;
      data.stcy = msg.text;
      let userStatus = data.userStatus;
      if (!userStatus) {
        data.userStatus = {};
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
      userStatus[msg.from?.id].score = Number(userStatus[msg.from?.id].score) + 1;
      // 判断combo
      if (!data.combo) {
        data.combo = 0;
      }
      if (data.lastJielonger === msg.from?.id) {
        data.combo = data.combo + 1;
      } else {
        const lastJielonger = data.lastJielonger;
        if (lastJielonger) {
          userStatus[lastJielonger].combo = Math.max(
            userStatus[lastJielonger].combo ?? 0,
            data.combo
          );
        }
        data.combo = 1;
        data.lastJielonger = msg.from?.id;
      }

      data.userStatus = userStatus;

      if (data.combo <= 2) {
        void app.bot?.sendMessage(
          msg.chat.id,
          `接龙成功！${getName(msg?.from)} 分数+1。\n下一个开头：${data.st}`
        );
      } else {
        void app.bot?.sendMessage(
          msg.chat.id,
          `${getName(msg?.from)} ${data.combo} 连击！\n下一个开头：${data.st}`
        );
      }
    }
  }
};

const init: PluginInit = (app) => {
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
