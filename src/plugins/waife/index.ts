import { App } from '@/types/app.js';
import { PluginInit } from '@/types/plugin.js';
import { Message, User } from 'node-telegram-bot-api';

function getName(user: User): string {
  let username:string = user.first_name ?
    user.first_name : (user.username ? user.username : '');
  if (user.last_name) {
    username += ' ' + user.last_name;
  }
  return username;
}

function htmlify(str: string | undefined): string {
  if (!str) {str = '';}
  str = str.replaceAll('&', '&amp;');
  str = str.replaceAll('<', '&lt;');
  str = str.replaceAll('>', '&gt;');
  str = str.replaceAll('"', '&quot;');
  return str;
}


function initialize_waifes(app: App, msg: Message) {
  if (!app.db.chat(msg.chat.id).waifes) {
    app.db.chat(msg.chat.id).waifes = [];
    app.db.chat(msg.chat.id).waife_ids = {};
  }
  if (!app.db.chat(msg.chat.id).waifemap) {
    app.db.chat(msg.chat.id).waifemap = {};
  }
  if (!app.db.chat(msg.chat.id).iduserMap) {
    app.db.chat(msg.chat.id).iduserMap = {};
  }
  if (!app.db.chat(msg.chat.id).lastwaifedate) {
    app.db.chat(msg.chat.id).lastwaifedate = (new Date).toDateString();
  }
}

async function add_to_wife(app: App, msg: Message, uid?: number) {
  initialize_waifes(app, msg);
  if (!uid) { return; }
  if (app.db.chat(msg.chat.id).waife_ids[uid]) {
    return;
  }
  let you;
  if (msg.from?.id !== uid) {
    you = (await app.bot.getChatMember(msg.chat.id, uid)).user;
  } else {
    you = msg.from;
  }
  app.db.chat(msg.chat.id).waife_ids[uid] = true;
  app.db.chat(msg.chat.id).waifes.push(you);
  app.db.chat(msg.chat.id).iduserMap[uid] = you;
}

async function getWaifesList(app: App, msg: Message) {
  initialize_waifes(app, msg);
  if (app.db.chat(msg.chat.id).waifes.length === 0) {
    const defaultWaifes = await app.bot.getChatAdministrators(msg.chat.id);
    for (const waife of defaultWaifes) {
      app.db.chat(msg.chat.id).waifes.push(waife.user);
      app.db.chat(msg.chat.id).waife_ids[waife.user.id];
      app.db.chat(msg.chat.id).iduserMap[waife.user.id] = waife;
    }
    await add_to_wife(app, msg, msg.from?.id);
  }
  return app.db.chat(msg.chat.id).waifes;
}

async function getWaife(app: App, msg: Message) {
  if (!msg.from?.id) { return; }
  if ((new Date).toDateString() !== app.db.chat(msg.chat.id).lastwaifedate) {
    app.db.chat(msg.chat.id).waifemap = {};
    app.db.chat(msg.chat.id).lastwaifedate = (new Date).toDateString();
  }
  if (app.db.chat(msg.chat.id).waifemap[msg.from?.id]) {
    app.bot.sendMessage(msg.chat.id, '你今天已经抽过老婆了哦！', {
      reply_to_message_id: msg.message_id,
    });
    return;
  }
  const lst = await getWaifesList(app, msg);
  if (lst.length <= 1) {
    app.bot.sendMessage(msg.chat.id, '抱歉，我还没从群里获取到足够多的人哦，请先回复我一些消息', {
      reply_to_message_id: msg.message_id,
    });
    return;
  }
  let waife: User = lst[Math.floor(Math.random() * lst.length)];
  let cnt = 0;
  while (waife.id === msg.from?.id && cnt < 20) {
    waife = lst[Math.floor(Math.random() * lst.length)];
    cnt++;
  }
  if (waife.id === msg.from?.id) {
    app.bot.sendMessage(msg.chat.id, '获取失败……理论上不会出现这个情况, 请查看bot代码', {
      reply_to_message_id: msg.message_id,
    });
    return;
  }
  add_to_wife(app, msg, msg.from.id);
  const res = await app.bot.sendMessage(
    msg.chat.id,
    `${htmlify('获取成功~ 你今天的群友老婆是')} <a href="tg://user?id=${waife.id}">${htmlify(getName(waife))}</a>`,
    {
      parse_mode: 'HTML',
      reply_to_message_id: msg.message_id,
    }
  );
  app.db.chat(msg.chat.id).waifemap[msg.from?.id] = {
    msg_id: res.message_id,
    date: res.date,
    waife,
  };
}

async function getWaifeGraph(app: App, msg: Message) {
  initialize_waifes(app, msg);
  if (!msg.from?.id) { return; }
  const wfMap = app.db.chat(msg.chat.id).waifemap;
  const iduM = app.db.chat(msg.chat.id).iduserMap;
  let txt = '```mermaid\n';
  txt += '\ngraph TD';
  for (const id in wfMap) {
    if (wfMap[id]?.waife) {
      txt += `\n    ${id}["${getName(iduM[id])}"] --> ${wfMap[id]?.waife?.id}["${getName(wfMap[id].waife)}"]`;
    }
  }
  txt += '\n```';
  app.bot.sendMessage(
    msg.chat.id,
    `老婆图（mermaid）：\n<pre>${htmlify(txt)}</pre>`,
    {
      parse_mode: 'HTML',
      reply_to_message_id: msg.message_id,
    }
  );
}

const init: PluginInit = (app) => {
  app.registCommand({
    chat_type: ['group', 'supergroup'],
    command: 'waife',
    handle: getWaife,
    description: '获取老婆！'
  });
  app.registCommand({
    chat_type: ['group', 'supergroup'],
    command: 'waife_graph',
    handle: getWaifeGraph,
    description: '获取老婆关系图！'
  });
  app.registReplyHandle({
    chat_type: ['group', 'supergroup'],
    handle: (appl, msg) => {
      add_to_wife(appl, msg, msg.from?.id);
    },
    description: '添加老婆！'
  });
};

export { init };