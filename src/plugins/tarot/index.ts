import { commandHandleFunction } from '@/lib/command.js';
import { PluginInit } from '@/types/plugin.js';
import { getTarots } from './tarot.js';
import { Message } from 'node-telegram-bot-api';

function getName(message: Message): string {
  let username: string = message.from?.first_name
    ? message.from?.first_name
    : message.from?.username
      ? message.from?.username
      : '';
  if (message.from?.last_name) {
    username += ' ' + message.from?.last_name;
  }
  return username;
}

const sendTarot: commandHandleFunction = (app, msg, txt) => {
  if (!txt?.trim()) {
    txt = '1';
  }
  const tarots = getTarots(app, txt);
  app.bot?.sendMessage(
    msg.chat.id,
    `${getName(msg)}最近遇到了什么烦心事吗？让琳酱给你算一算:`,
  );
  setTimeout(() => {
    app.bot?.sendMessage(
      msg.chat.id,
      `${getName(msg)}抽到的牌组是：\n${tarots}`,
    );
  }, 3000);
};

const init: PluginInit = (app) => {
  console.log('xxx loaded!');
  app.registCommand({
    command: 'tarot',
    chat_type: 'all',
    description: '抽取k张塔罗牌',
    handle: sendTarot,
  });
};

export { init };
