import { App } from '@/types/app.js';
import { PluginInit } from '@/types/plugin.js';
import { Message } from 'node-telegram-bot-api';

async function setTitle(app: App, msg: Message, title: string = '') {
  if (msg.from?.id) {
    if (title.length >= 16) {
      void app.bot.sendMessage(msg.chat.id, '你想要的头衔太长了哦', {
        reply_to_message_id: msg.message_id,
      });
      return;
    }
    if (!['group', 'supergroup'].includes(msg.chat.type)) {
      void app.bot.sendMessage(msg.chat.id, '需要在群里才能设置头衔哦', {
        reply_to_message_id: msg.message_id,
      });
      return;
    }
    try {
      if (title.length <= 0) {
        await app.bot.promoteChatMember(msg.chat.id, msg.from?.id);
        void app.bot.sendMessage(msg.chat.id, '清除头衔成功', {
          reply_to_message_id: msg.message_id,
        });
      } else {
        await app.bot.promoteChatMember(msg.chat.id, msg.from?.id, {
          can_pin_messages: true,
        });
        await app.bot.setChatAdministratorCustomTitle(msg.chat.id, msg.from?.id, title);
        void app.bot.sendMessage(msg.chat.id, `设置成功，你现在是${title}了`, {
          reply_to_message_id: msg.message_id,
        });
      }
    } catch (err) {
      if (!(err instanceof Error)) {
        console.log('Error not instance of Error during setting title');
        throw err;
      }
      console.log(JSON.stringify(err));
      if (err.message.includes('can\'t remove chat owner')) {
        void app.bot.sendMessage(msg.chat.id, '不能给群主设置头衔哦', {
          reply_to_message_id: msg.message_id,
        });
        return;
      }
      if (
        err.message.includes('not enough rights') ||
        err.message.includes('user is not an administrator') ||
        err.message.includes('CHAT_ADMIN_REQUIRED')
      ) {
        void app.bot.sendMessage(msg.chat.id, `${app.config.bot_name}还没这个权限哦`, {
          reply_to_message_id: msg.message_id,
        });
        return;
      }
      if (err.message.includes('ADMIN_RANK_EMOJI_NOT_ALLOWED')) {
        void app.bot.sendMessage(msg.chat.id, '头衔中不能有emoji哦', {
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
