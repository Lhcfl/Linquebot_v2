import { Message } from 'node-telegram-bot-api';
import { PluginInit } from '@/types/plugin.js';
import { App } from '@/types/app.js';

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

const rong = (app: App, msg: Message, msgTxt?: string, rev?: boolean) => {
  msgTxt = htmlify(msgTxt?.trim());
  if (msgTxt === '') {
    msgTxt = 'rong了';
  }
  if (typeof msgTxt === 'string' && msgTxt.length >= 1) {
    let a = getName(msg);
    let b = undefined;
    let bid = msg.from?.id;
    if (msg.reply_to_message) {
      b = getName(msg.reply_to_message);
      bid = msg.reply_to_message.from?.id;
    }
    if (a === b || b === undefined) {
      b = '自己';
    }
    a = htmlify(a);
    b = htmlify(b);
    let A = `<a href="tg://user?id=${msg.from?.id}">${a}</a>`;
    let B = `<a href="tg://user?id=${bid}">${b}</a>`;
    if (rev) {
      [A, B] = [B, A];
    }
    const i = msgTxt?.indexOf(' ');
    if (i === -1) {
      app.bot?.sendMessage(msg.chat.id, `${A} ${msgTxt} ${B}!`, {
        parse_mode: 'HTML',
        reply_to_message_id: msg.message_id,
      });
    } else {
      app.bot?.sendMessage(
        msg.chat.id,
        `${A} ${msgTxt.substring(0, i)} ${B} ${msgTxt.substring(i + 1)}!`,
        {
          parse_mode: 'HTML',
          reply_to_message_id: msg.message_id,
        },
      );
    }
  }
};

const init: PluginInit = (app) => {
  console.log('rongBot loaded!');
  app.registCommand({
    chat_type: 'all',
    command: 'rong',
    handle: (Appl, msg, msgTxt) => {
      rong(Appl, msg, msgTxt);
    },
    description: 'rong [str1?] [str2?] rong一下！',
  });
  app.registCommand({
    chat_type: 'all',
    command: 'gnor',
    handle: (Appl, msg, msgTxt) => {
      rong(Appl, msg, msgTxt, true);
    },
    description: 'gnor [str1?] [str2?] 被rong一下！',
  });
};

export { init };
