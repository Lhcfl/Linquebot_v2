import { App } from '@/types/app.js';
import { PluginInit } from '@/types/plugin.js';
import { Message, User } from 'node-telegram-bot-api';
import { tmpdir } from 'os';
import fs from 'fs/promises';
import { spawn } from 'child_process';
import { escapeLit, getName } from '@/util/string.js';

class Data {
  waifes: User[] = [];
  waifemap: { [uid: number]: { waife: User; date: number } } = {};
  lastwaifedate: string = '';
  waife_ids: { [k: number]: boolean } = {};
  iduserMap: { [uid: number]: User } = {};
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
async function add_to_wife(app: App, chat: Data, msg: Message, uid?: number) {
  if (!uid) {
    return;
  }
  if (chat.waife_ids[uid]) {
    return;
  }
  let you;
  if (msg.from?.id !== uid) {
    you = (await app.bot.getChatMember(msg.chat.id, uid)).user;
  } else {
    you = msg.from;
  }
  chat.waife_ids[uid] = true;
  chat.waifes.push(you);
  chat.iduserMap[uid] = you;
}

/**
 * Initialize and get Waifes List
 */
async function getWaifesList(app: App, chat: Data, msg: Message) {
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
async function getWaife(app: App, msg: Message) {
  if (!msg.from?.id) {
    return;
  }
  await using waifedb = await app.db.db<Data>('waife');
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
    void app.bot.sendMessage(
      msg.chat.id,
      '抱歉，我还没从群里获取到足够多的人哦，请先回复我一些消息',
      {
        reply_to_message_id: msg.message_id,
      }
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
    void app.bot.sendMessage(msg.chat.id, '获取失败……理论上不会出现这个情况, 请查看bot代码', {
      reply_to_message_id: msg.message_id,
    });
    return;
  }
  const res = await app.bot.sendMessage(
    msg.chat.id,
    `${htmlify('获取成功~ 你今天的群友老婆是')} <a href="tg://user?id=${waife.id}">${htmlify(
      getName(waife)
    )}</a>`,
    {
      parse_mode: 'HTML',
      reply_to_message_id: msg.message_id,
    }
  );
  chat.waifemap[msg.from?.id] = { date: res.date, waife };
  await add_to_wife(app, chat, msg, msg.from.id);
}

async function renderGraph(id: string, src: string): Promise<Buffer> {
  const [fname, outname] = [`${tmpdir()}/${id}.gv`, `${tmpdir()}/${id}.png`];
  await fs.writeFile(fname, src, { encoding: 'utf8' });
  await new Promise((res, rej) => {
    const proc = spawn('dot', [fname, '-Tpng', '-o', outname]);
    proc.on('close', (code) => (code === 0 ? res(void 0) : rej(code)));
  });
  return await fs.readFile(outname);
}

async function getWaifeGraph(app: App, msg: Message) {
  if (!msg.from?.id) {
    return;
  }
  const waifedb = await app.db.db<Data>('waife');
  const chat = waifedb.peek[msg.chat.id];
  const wfMap = chat.waifemap;
  if (Object.keys(wfMap).length <= 0) {
    void app.bot.sendMessage(msg.chat.id, '群里还没人有老婆哦！', {
      reply_to_message_id: msg.message_id,
    });
    return;
  }
  const iduser = chat.iduserMap;
  const getNode = (user: User) => `${user.id}[label="${escapeLit(getName(user))}"]`;
  const uidMap: { [key: string]: boolean } = {};
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
  } catch (err) {
    void app.bot.sendMessage(msg.chat.id, `诶呀，生成图片中出现了错误…… ${JSON.stringify(err)}`, {
      reply_to_message_id: msg.message_id,
    });
    void app.bot.deleteMessage(msg.chat.id, (await qidao).message_id);
  }
}

const init: PluginInit = (app) => {
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
      await using db = await app.db.db<Data>('waife');
      await add_to_wife(appl, db.data[msg.chat.id], msg, msg.from?.id);
    },
    description: '添加老婆！',
  });
};

export { init };
