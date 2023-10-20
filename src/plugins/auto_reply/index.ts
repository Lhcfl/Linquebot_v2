import { App } from '@/types/app.js';
import { PluginInit } from '@/types/plugin.js';
import { getName } from '@/util/string.js';
import { Message } from 'node-telegram-bot-api';

type Data = {
  [user: number]: {
    last_reply: Date;
  };
};

const handleReply = async (app: App, msg: Message) => {
  const msgdate = new Date(msg.date * 1000);
  const msghr = msgdate.getHours();
  await using curdb = await app.db.db<Data>('auto_reply');
  const chat = curdb.data[msg.chat.id];
  if (!(msg.from!.id in chat)) {
    chat[msg.from!.id] = { last_reply: new Date(0) };
  }
  const repdate = new Date(chat[msg.from!.id].last_reply);
  const reply_invs: [number, number, string][] = [
    [22, 23, '很晚了呢, 揉揉${user}, 该睡觉了呢, 不要熬夜哦'],
    [0, 1, '很晚了呢, 揉揉${user}, 该睡觉了呢, 不要熬夜哦'],
    [2, 4, '是凌晨了呢, 揉揉抱抱${user}, 要注意身体呀, 记得睡觉的说'],
    [7, 10, '早安, ${user}~ 新的一天也会有新的美好的~'],
  ];
  const vars: { [k: string]: string } = {
    user: getName(msg.from),
  };
  const reply_it = reply_invs.find(([lo, hi]) => lo <= msghr && msghr <= hi);
  if (reply_it === undefined) return;
  const rephr = repdate.getHours();
  const [lo, hi, rep] = reply_it;
  if (
    lo <= rephr &&
    rephr <= hi &&
    msgdate.getTime() - repdate.getTime() <= (hi - lo + 1) * 3600_000
  )
    return;
  void app.bot.sendMessage(
    msg.chat.id,
    rep.replaceAll(/\${(\w*)}/g, (_, s: string) => vars[s])
  );
  chat[msg.from!.id].last_reply = msgdate;
};

const init: PluginInit = (init_app) => {
  init_app.db.register('auto_reply', [() => ({})]);
  init_app.registGlobalMessageHandle({
    chat_type: 'all',
    description: '向用户发送一些自动回复',
    handle: handleReply,
  });
};

export { init };
