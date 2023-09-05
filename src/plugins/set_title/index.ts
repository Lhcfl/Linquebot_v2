import { App } from '@/types/app.js';
import { PluginInit } from '@/types/plugin.js';
import { Message } from 'node-telegram-bot-api';

async function setTitle(app: App, msg: Message, title: string = '') {
  if (msg.from?.id) {
    if (title.length >= 16) {
      app.bot.sendMessage(msg.chat.id, '你想要的头衔太长了哦', {
        reply_to_message_id: msg.message_id,
      });
      return;
    }
    if (!['group', 'supergroup'].includes(msg.chat.type)) {
      app.bot.sendMessage(msg.chat.id, '需要在群里才能设置头衔哦', {
        reply_to_message_id: msg.message_id,
      });
      return;
    }
    try {
      if (title.length <= 0) {
        await app.bot.promoteChatMember(msg.chat.id, msg.from?.id);
        app.bot.sendMessage(msg.chat.id, '清除头衔成功', {
          reply_to_message_id: msg.message_id,
        });
      } else {
        await app.bot.promoteChatMember(msg.chat.id, msg.from?.id, {
          can_pin_messages: true,
        });
        await app.bot.setChatAdministratorCustomTitle(
          msg.chat.id,
          msg.from?.id,
          title,
        );
        app.bot.sendMessage(msg.chat.id, `设置成功，你现在是${title}了`, {
          reply_to_message_id: msg.message_id,
        });
      }
    } catch (err) {
      const errobj = JSON.parse(JSON.stringify(err));
      console.log(JSON.stringify(err));
      if (errobj.message.includes('can\'t remove chat owner')) {
        app.bot.sendMessage(msg.chat.id, '不能给群主设置头衔哦', {
          reply_to_message_id: msg.message_id,
        });
        return;
      }
      if (
        errobj.message.includes('not enough rights') ||
        errobj.message.includes('user is not an administrator') ||
        errobj.message.includes('CHAT_ADMIN_REQUIRED')
      ) {
        app.bot.sendMessage(
          msg.chat.id,
          `${app.config.bot_name}还没这个权限哦`,
          {
            reply_to_message_id: msg.message_id,
          },
        );
        return;
      }
      if (errobj.message.includes('ADMIN_RANK_EMOJI_NOT_ALLOWED')) {
        app.bot.sendMessage(msg.chat.id, '头衔中不能有emoji哦', {
          reply_to_message_id: msg.message_id,
        });
        return;
      }
    }
  }
}

const init: PluginInit = (app) => {
  app.registCommand({
    chat_type: ['group', 'supergroup'],
    command: 't',
    handle: setTitle,
    description: '/t [头衔] 设置头衔！',
  });
};

export { init };
