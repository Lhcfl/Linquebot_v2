import { App } from '@/types/app.js';
import { PluginInit } from '@/types/plugin.js';
import { getName } from '@/util/string.js';
import { Message } from 'node-telegram-bot-api';
import dayjs from 'dayjs';
import dayjs_utc from 'dayjs/plugin/utc.js';
import dayjs_timezone from 'dayjs/plugin/timezone.js';

[dayjs_utc, dayjs_timezone].forEach((it) => dayjs.extend(it));

const reply_invs: [number, number, string[]][] = [
  [
    22,
    23,
    [
      '很晚了呢, 揉揉${user}, 该睡觉了呢, 不要熬夜哦',
      '咕咕晚上好！${user} 该睡觉了，不要熬夜哦！',
      '晚上好喵！${user} 有点晚了，记得早睡哦！',
    ],
  ],
  [
    0,
    1,
    [
      '很晚了呢, 揉揉${user}, 该睡觉了呢, 不要熬夜哦',
      '已经第二天了呢, 揉揉${user}, 该睡觉了呢, 不要熬夜哦',
      '夜深了，揉揉${user}, 不要熬夜哦，早点睡觉哦',
    ],
  ],
  [
    2,
    4,
    [
      '是凌晨了呢, 揉揉抱抱${user}, 要注意身体呀, 记得睡觉的说',
      '晚安喵~ ${user} 很晚了，记得早点休息哦！',
      '嗨呀！都凌晨了qaq ${user} 要放下手机早点入睡哦！',
      '很晚很晚了呢，${user}，记得要好好休息哦！',
      '真的很晚了呢, 揉揉抱抱${user}, 要注意身体呀, 记得睡觉的说',
      '该睡觉了呜…… ${user}, 要注意身体呀，现在真的很晚了',
    ],
  ],
  [
    7,
    10,
    [
      '早安, ${user}~ 新的一天也会有新的美好的~',
      '早安，${user}大人！今天会是充满活力的一天呢~',
      '嗨, ${user}! 早晨的新鲜空气总是令人振奋呢，希望你能有一个美好的一天',
      '${user}酱，睡得如何喵？期待与您一起迎接新的一天。',
      '早安喵~ ${user}酱！今天要元气满满哦！',
    ],
  ],
];

function getSample<T>(a: T[]) {
  return a[Math.floor(Math.random() * a.length)];
}

type Data = {
  last_reply: { [grp: number]: number };
  tz: string;
};

const handleReply = async (app: App, msg: Message) => {
  if (msg.from === undefined) return;

  // We expect Linquebot to auto-reply more randomly to prevent sudden interruptions.
  if (Math.random() > 0.1) return;

  await using db = await app.db.db<Data>('auto_reply');
  const usrdb = db.data[msg.from.id];
  const msgdate = dayjs.unix(msg.date).tz(usrdb.tz);
  const msghr = msgdate.hour();
  const repdate = dayjs.unix(usrdb.last_reply[msg.chat.id]).tz(usrdb.tz);

  const vars: { [k: string]: string } = {
    user: getName(msg.from),
  };
  const reply_it = reply_invs.find(([lo, hi]) => lo <= msghr && msghr <= hi);
  if (reply_it === undefined) return;
  const rephr = repdate.hour();
  const [lo, hi, rep] = reply_it;
  if (lo <= rephr && rephr <= hi && msgdate.diff(repdate, 'hour') <= hi - lo + 1) return;
  void app.bot.sendMessage(
    msg.chat.id,
    getSample(rep).replaceAll(/\${(\w*)}/g, (_, s: string) => vars[s])
  );
  usrdb.last_reply[msg.chat.id] = msgdate.unix();
};

const init: PluginInit = (init_app) => {
  init_app.db.register('auto_reply', [() => ({ last_reply: {}, tz: 'Asia/Shanghai' })]);
  init_app.registGlobalMessageHandle({
    chat_type: 'all',
    description: '向用户发送一些自动回复',
    handle: handleReply,
  });
  init_app.registCommand({
    command: 'set_tz',
    description: '设置用户当前的时区名, 例如, Europe/Rome',
    handle: async (app, msg, text) => {
      if (msg.from === undefined) return;
      if (!text) {
        void app.bot.sendMessage(msg.chat.id, '需要一个时区名', {
          reply_to_message_id: msg.message_id,
        });
        return;
      }
      text = text.trim();
      try {
        dayjs().tz(text);
      } catch (e) {
        if (e instanceof RangeError) {
          void app.bot.sendMessage(msg.chat.id, '无法识别时区名', {
            reply_to_message_id: msg.message_id,
          });
          return;
        }
      }
      await using db = await app.db.db<Data>('auto_reply');
      db.data[msg.from.id].tz = text;
      void app.bot.sendMessage(msg.chat.id, '时区设置成功', {
        reply_to_message_id: msg.message_id,
      });
    },
  });
};

export { init };
