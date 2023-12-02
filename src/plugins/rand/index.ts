import { App } from '@/types/app.js';
import { PluginInit } from '@/types/plugin.js';
import { getName } from '@/util/string.js';
import { Message } from 'node-telegram-bot-api';

function rand(app: App, msg: Message, msgTxt?: string) {
  const result = Math.floor(Math.random() * 101);
  const username = getName(msg.from);
  if (msgTxt) {
    void app.bot.sendMessage(msg.chat.id, `${username} ${msgTxt} 的概率是: ${result}%`);
  } else {
    void app.bot.sendMessage(msg.chat.id, `${username} 掷出了: ${result}`);
  }
}

function randnoid(app: App, msg: Message, msgTxt?: string) {
  const result = Math.floor(Math.random() * 101);
  if (msgTxt) {
    void app.bot.sendMessage(msg.chat.id, `${msgTxt} 的概率是: ${result}%`);
  }
}

function dice(app: App, msg: Message, txt?: string) {
  const sub = txt?.trim().match(/^(\d+)d(\d+)$/);
  if (!sub || sub.length < 3) return void app.bot.sendMessage(msg.chat.id, '只支持xdy的格式');
  const res = Array.from({ length: Number(sub[1]) }, () =>
    Math.floor(Math.random() * Number(sub[2]))
  );
  const sum = res.reduce((a, b) => a + b);
  void app.bot.sendMessage(msg.chat.id, `${getName(msg.from)} 掷出了${sum}: ${res.join(', ')}`);
}

export const init: PluginInit = (app) => {
  console.log('rand loaded!');
  app.registCommand({
    chat_type: 'all',
    command: 'rand',
    handle: rand,
    description: 'rand [事件?]：投掷骰子, 结果是一个百分比',
  });
  app.registCommand({
    chat_type: 'all',
    command: 'randnoid',
    handle: randnoid,
    description: 'randnoid [事件]：投掷骰子, 结果是一个百分比，但不显示投掷者名字',
  });
  app.registCommand({
    chat_type: 'all',
    command: 'dice',
    handle: dice,
    description: 'dice 配置: 投掷骰子, 以xdy的格式投掷x次y面骰子',
  });
};
