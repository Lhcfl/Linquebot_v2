import { commandHandleFunction } from '@/lib/command.js';
import { PluginInit } from '@/types/plugin.js';
import { getTarots } from './tarot.js';
import { getName } from '@/util/string.js';

const sendTarot: commandHandleFunction = (app, msg, txt) => {
  if (!txt?.trim()) {
    txt = '1';
  }
  const tarots = getTarots(app, txt);
  void app.bot?.sendMessage(
    msg.chat.id,
    `${getName(msg.from)}最近遇到了什么烦心事吗？让琳酱给你算一算:`
  );
  setTimeout(() => {
    void app.bot?.sendMessage(msg.chat.id, `${getName(msg.from)}抽到的牌组是：\n${tarots}`);
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
