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
  const msgdate = new Date(msg.date);
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
    [5, 6, '早安, ${user}~ 希望早起的你能无往不利呢'],
    [7, 9, '早安, ${user}~ 新的一天也会有新的美好的~'],
  ];
  // If last reply date is in this time range, return
  if (
    msgdate.getTime() - repdate.getTime() >= 86400_000 ||
    reply_invs.find(([lo, hi]) => lo <= repdate.getHours() && repdate.getHours() <= hi) ===
      undefined
  ) {
    const vars: { [k: string]: string } = {
      user: getName(msg.from),
    };
    for (const [lo, hi, rep] of reply_invs) {
      if (msghr >= lo && msghr <= hi) {
        void app.bot.sendMessage(
          msg.chat.id,
          rep.replaceAll(/\${(\w*)}/g, (_, s: string) => vars[s])
        );
        chat[msg.from!.id].last_reply = new Date();
        break;
      }
    }
  }
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
