import * as path from 'path';

import { createCanvas, loadImage, registerFont } from 'canvas';
import { Message } from 'node-telegram-bot-api';

import { PluginInit } from '@/types/plugin.js';

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
  if (str === undefined) str = '';
  str = str.replaceAll('&', '&amp;');
  str = str.replaceAll('<', '&lt;');
  str = str.replaceAll('>', '&gt;');
  str = str.replaceAll('"', '&quot;');
  return str;
}

const init: PluginInit = (app) => {
  console.log('pure_women plugin loaded!');

  // Register the font
  // const fontPath = path.join(process.cwd(), "./assets/font/LynneGuyu.ttf");
  // registerFont(fontPath, { family: "Lynne" });
  const fontPath = path.join(process.cwd(), './assets/font/comic.ttf');
  registerFont(fontPath, { family: 'Comic' });

  app.registCommand({
    chat_type: 'all',
    command: 'pure_women',
    handle: async (App, msg, msgTxt) => {
      msgTxt = htmlify(msgTxt?.trim());
      if (typeof msgTxt === 'string') {
        try {
          const a = getName(msg);
          const b = getName(msg.reply_to_message || msg);
          let bid = msg.from?.id;
          if (msg.reply_to_message) {
            bid = msg.reply_to_message.from?.id;
          }
          const name = msgTxt || (a === b ? a : b);

          // Check if name contains Chinese characters
          if (/[\u4e00-\u9fa5]/.test(name)) {
            await App.bot?.sendMessage(msg.chat.id, '暂不支持中文！', {
              reply_to_message_id: msg.message_id,
            });
            return;
          }

          // Load the template image
          const templatePath = path.join(
            process.cwd(),
            './assets/image/pure-women-certification.png'
          );
          const template = await loadImage(templatePath);

          // Create canvas with the same dimensions as the template
          const canvas = createCanvas(2000, 1424);
          const ctx = canvas.getContext('2d');

          // Draw the template image
          ctx.drawImage(template, 0, 0);

          // Set text properties
          ctx.font = 'bold 160px Comic';
          ctx.fillStyle = '#a85b5f';
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';

          // Draw the name in the center
          ctx.fillText(name, canvas.width / 2, canvas.height / 2);

          // Convert canvas to buffer
          const buffer = canvas.toBuffer('image/png');

          const A = `<a href="tg://user?id=${msg.from?.id}">${a}</a>`;
          const B = `<a href="tg://user?id=${bid}">${b}</a>`;

          // Send the image
          await App.bot?.sendPhoto(msg.chat.id, buffer, {
            caption: `${msgTxt ? msgTxt : a === b ? A : B} 的纯女证书已生成!`,
            parse_mode: 'HTML',
            reply_to_message_id: msg.message_id,
          });
        } catch (error) {
          console.error('Error generating certificate:', error);
          void App.bot?.sendMessage(msg.chat.id, '生成证书时发生错误，请稍后重试。');
        }
      }
    },
    description: '输入名字，生成纯女证书（目前不支持中文）',
    off_mode: true,
  });
};

export { init };
