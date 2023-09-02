import { Message } from 'node-telegram-bot-api';
import { PluginInit } from '../../types/plugin.js';

function getName(message: Message): string {
  let username:string = message.from?.first_name ?
    message.from?.first_name : (message.from?.username ? message.from?.username : '');
  if (message.from?.last_name) {
    username += ' ' + message.from?.last_name;
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

const init: PluginInit = (app) => {
  console.log('rongBot loaded!');
  app.registCommand({
    chat_type: 'all',
    command: 'rong',
    handle: (App, msg, msgTxt) => {
      msgTxt = htmlify(msgTxt?.trim());
      if (msgTxt === '') {msgTxt = 'rong了';}
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
        const i = msgTxt?.indexOf(' ');
        if (i === -1) {
          App.bot?.sendMessage(msg.chat.id, `<a href="tg://user?id=${msg.from?.id}">${a}</a> ${msgTxt} <a href="tg://user?id=${bid}">${b}</a>!`, {
            parse_mode: 'HTML',
            reply_to_message_id: msg.message_id,
          });
        } else {
          App.bot?.sendMessage(msg.chat.id, `<a href="tg://user?id=${msg.from?.id}">${a}</a> ${msgTxt.substring(0, i)} <a href="tg://user?id=${bid}">${b}</a> ${msgTxt.substring(i + 1)}!`, {
            parse_mode: 'HTML',
            reply_to_message_id: msg.message_id,
          });
        }
      }
    },
    description: 'rong [str1?] [str2?] rong一下！'
  });
};

export { init };