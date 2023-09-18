import { App } from '@/types/app.js';
import { PluginInit } from '@/types/plugin.js';
import { Message } from 'node-telegram-bot-api';

function rand(app: App, msg: Message) {
  const result = Math.floor(Math.random() * 101);
  let username = msg.from?.first_name ? msg.from?.first_name : msg.from?.username;
  if (msg.from?.last_name) {
    username += ' ' + msg.from?.last_name;
  }
  if (msg.text) {
    void app.bot.sendMessage(msg.chat.id, `${username} ${msg.text} 的概率是: ${result}%`);
  } else {
    void app.bot.sendMessage(msg.chat.id, `${username} 掷出了: ${result}`);
  }
}

function randnoid(app: App, msg: Message) {
  const result = Math.floor(Math.random() * 101);
  if (msg.text) {
    void app.bot.sendMessage(msg.chat.id, `${msg.text} 的概率是: ${result}%`);
  }
}

export const init: PluginInit = (app) => {
  console.log('rand loaded!');
  app.registCommand({
    chat_type: 'all',
    command: 'rand',
    handle: rand,
    description: 'rand [事件?]：投掷骰子',
  });
  app.registCommand({
    chat_type: 'all',
    command: 'randnoid',
    handle: randnoid,
    description: 'randnoid [事件]：投掷骰子，但不显示投掷者名字',
  });
};
