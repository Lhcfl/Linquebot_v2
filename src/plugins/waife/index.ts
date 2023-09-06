import { App } from '@/types/app.js';
import { PluginInit } from '@/types/plugin.js';
import { Message, User } from 'node-telegram-bot-api';
import { tmpdir } from 'os';
import fs from 'fs';
import { spawn } from 'child_process';

const DB = {
  /**
   * 老婆卡池
   */
  getWaifes(app: App, msg: Message): User[] {
    if (!app.db.chat(msg.chat.id).waifes) {
      app.db.chat(msg.chat.id).waifes = [];
      app.db.chat(msg.chat.id).waife_ids = {};
      console.log('未找到waifes数据，初始化为[]');
    }
    return app.db.chat(msg.chat.id).waifes;
  },
  /**
   * @returns 一个Map，根据uid获取老婆卡池中是否存在该uid对应的老婆
   */
  getWaifeIds(app: App, msg: Message): {[key: number]: boolean} {
    if (!app.db.chat(msg.chat.id).waife_ids) {
      app.db.chat(msg.chat.id).waifes = [];
      app.db.chat(msg.chat.id).waife_ids = {};
      console.log('未找到waife_ids数据，初始化为{}');
    }
    return app.db.chat(msg.chat.id).waife_ids;
  },
  /**
   * 获取老婆关系Map
   * @returns 一个Map，根据uid获取uid对应的用户的老婆
   */
  getWaifeMap(app: App, msg: Message): {
    [key: number]: {
      /**
       * `/waife`命令输出的message id
       */
      msg_id: number,
      /**
       * `/waife`命令的message的date
       */
      date: number,
      /**
       * uid对应的老婆
       */
      waife: User,
    }
  } {
    if (!app.db.chat(msg.chat.id).waifemap) {
      /**
       * waifemap[a] id为a的用户的老婆
       */
      this.clearWaifeMap(app, msg);
    }
    return app.db.chat(msg.chat.id).waifemap;
  },
  clearWaifeMap(app: App, msg: Message): void {
    app.db.chat(msg.chat.id).waifemap = {};
  },
  /**
   * iduserMap[a] id为a的用户
   */
  idUserMap(app: App, msg: Message): {[key: number]: User} {
    if (!app.db.chat(msg.chat.id).iduserMap) {
      app.db.chat(msg.chat.id).iduserMap = {};
    }
    return app.db.chat(msg.chat.id).iduserMap;
  },
  /**
   * 获取上次抽老婆的日期
   * @returns Date().toDateString();
   */
  getLastWaifeDate(app: App, msg: Message): string {
    if (!app.db.chat(msg.chat.id).lastwaifedate) {
      /**
       * iduserMap[a] 大家上次抽老婆的日期
       */
      this.updateLastWaifeDate(app, msg);
    }
    return app.db.chat(msg.chat.id).lastwaifedate;
  },
  /**
   * 更新上次抽老婆的日期
   */
  updateLastWaifeDate(app: App, msg: Message): void {
    app.db.chat(msg.chat.id).lastwaifedate = new Date().toDateString();
  }
  
};

/**
 * 从一个User中获取Name
 * @param user 
 * @returns name
 */
function getName(user: User): string {
  let username: string = user.first_name
    ? user.first_name
    : user.username
      ? user.username
      : '';
  if (user.last_name) {
    username += ' ' + user.last_name;
  }
  return username;
}

/**
 * 将一个字符串转义为HTLML安全的
 * @param str 待转化成html安全的字符串
 * @returns 
 */
function htmlify(str: string | undefined): string {
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
async function add_to_wife(app: App, msg: Message, uid?: number) {
  if (!uid) {
    return;
  }
  if (DB.getWaifeIds(app, msg)[uid]) {
    return;
  }
  let you;
  if (msg.from?.id !== uid) {
    you = (await app.bot.getChatMember(msg.chat.id, uid)).user;
  } else {
    you = msg.from;
  }
  DB.getWaifeIds(app, msg)[uid] = true;
  DB.getWaifes(app, msg).push(you);
  DB.idUserMap(app, msg)[uid] = you;
}

/**
 * Initialize and get Waifes List
 */
async function getWaifesList(app: App, msg: Message) {
  if (DB.getWaifes(app, msg).length === 0) {
    console.log('no waifes, getting...');
    const defaultWaifes = await app.bot.getChatAdministrators(msg.chat.id);
    console.log(defaultWaifes);
    for (const waife of defaultWaifes) {
      DB.getWaifes(app, msg).push(waife.user);
      DB.getWaifeIds(app, msg)[waife.user.id] = true;
      DB.idUserMap(app, msg)[waife.user.id] = waife.user;
    }
    await add_to_wife(app, msg, msg.from?.id);
  }
  return DB.getWaifes(app, msg);
}

/**
 * 获取老婆！
 * @param app 
 * @param msg 
 * @returns 
 */
async function getWaife(app: App, msg: Message) {
  if (!msg.from?.id) {
    return;
  }
  if (new Date().toDateString() !== DB.getLastWaifeDate(app, msg)) {
    DB.clearWaifeMap(app, msg);
    DB.updateLastWaifeDate(app, msg);
  }
  if (DB.getWaifeMap(app, msg)[msg.from?.id]) {
    app.bot.sendMessage(msg.chat.id, '你今天已经抽过老婆了哦！', {
      reply_to_message_id: msg.message_id,
    });
    return;
  }
  const lst = await getWaifesList(app, msg);
  if (lst.length <= 1) {
    app.bot.sendMessage(
      msg.chat.id,
      '抱歉，我还没从群里获取到足够多的人哦，请先回复我一些消息',
      {
        reply_to_message_id: msg.message_id,
      },
    );
    return;
  }
  let waife: User = lst[Math.floor(Math.random() * lst.length)];
  let cnt = 0;
  while (waife.id === msg.from?.id && cnt < 20) {
    waife = lst[Math.floor(Math.random() * lst.length)];
    cnt++;
  }
  if (waife.id === msg.from?.id) {
    app.bot.sendMessage(
      msg.chat.id,
      '获取失败……理论上不会出现这个情况, 请查看bot代码',
      {
        reply_to_message_id: msg.message_id,
      },
    );
    return;
  }
  add_to_wife(app, msg, msg.from.id);
  const res = await app.bot.sendMessage(
    msg.chat.id,
    `${htmlify('获取成功~ 你今天的群友老婆是')} <a href="tg://user?id=${
      waife.id
    }">${htmlify(getName(waife))}</a>`,
    {
      parse_mode: 'HTML',
      reply_to_message_id: msg.message_id,
    },
  );
  DB.getWaifeMap(app, msg)[msg.from?.id] = {
    msg_id: res.message_id,
    date: res.date,
    waife,
  };
}

async function renderGraph(id: string, src: string): Promise<Buffer> {
  const [fname, outname] = [`${tmpdir()}/${id}.gv`, `${tmpdir()}/${id}.png`];
  await new Promise((res, rej) =>
    fs.writeFile(fname, src, {encoding: 'utf-8'}, (err) => {
      if (err) {
        rej(err);
      } else {
        res({});
      }
    }),
  );
  await new Promise((res, rej) => {
    const proc = spawn('dot', [fname, '-Tpng', '-o', outname]);
    proc.on('close', (code) => {
      if (code !== 0) {
        rej(code);
      } else {
        res({});
      }
    });
  });
  return await new Promise((res, rej) =>
    fs.readFile(outname, {}, (err, data) => {
      if (err) {
        rej(err);
      } else {
        res(data);
      }
    }),
  );
}

async function getWaifeGraph(app: App, msg: Message) {
  if (!msg.from?.id) {
    return;
  }
  const wfMap = DB.getWaifeMap(app, msg);
  if (Object.keys(wfMap).length <= 0) {
    app.bot.sendMessage(msg.chat.id, '群里还没人有老婆哦！', {
      reply_to_message_id: msg.message_id,
    });
    return;
  }
  const iduser = DB.idUserMap(app, msg);
  const getNode = (user: User) => `${user.id}[label="${getName(user)}"]`;
  const uidMap: {[key: string]: boolean} = {};
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
  const src =
    'digraph G {\n' +
    'node[shape=box];\n' +
    txt.join('\n') +
    '\n}';
  console.log(src);
  const qidao = await app.bot.sendMessage(msg.chat.id, '少女祈祷中', {
    reply_to_message_id: msg.message_id,
  });
  try {
    const rendered = await renderGraph('waife', src);
    app.bot.deleteMessage(msg.chat.id, qidao.message_id);
    app.bot.sendPhoto(msg.chat.id, rendered, {
      reply_to_message_id: msg.message_id,
    });
  } catch (err) {
    app.bot.deleteMessage(msg.chat.id, qidao.message_id);
    app.bot.sendMessage(msg.chat.id, `诶呀，生成图片中出现了错误…… ${JSON.stringify(err)}`, {
      reply_to_message_id: msg.message_id,
    });
  }
}

const init: PluginInit = (app) => {
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
    handle: (appl, msg) => {
      add_to_wife(appl, msg, msg.from?.id);
    },
    description: '添加老婆！',
  });
};

export { init };