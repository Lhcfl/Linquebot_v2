import { botOnOffRegister, commandHandleFunction } from '../../lib/command.js';
import db from '../../lib/db.js';
import { PluginInit } from '../../types/plugin.js';


const bot_off: commandHandleFunction = (app, msg) => {
  db.chat(msg.chat.id).turned_off = true;
  app.bot?.sendMessage(msg.chat.id, 'bot 已关闭');
}
const bot_on: commandHandleFunction = (app, msg) => {
  db.chat(msg.chat.id).turned_off = false;
  app.bot?.sendMessage(msg.chat.id, 'bot 已开机');
}

const init: PluginInit = (app) => {
  console.log('xxx loaded!');
  botOnOffRegister((App, msg) => !db.chat(msg.chat.id).turned_off);
  app.registCommand({
    description: 'bot关机',
    chat_type: 'all',
    handle: bot_off,
    command: 'bot_off',
    off_mode: true,
  });
  app.registCommand({
    description: 'bot开机',
    chat_type: 'all',
    handle: bot_on,
    command: 'bot_on',
    off_mode: true,
  })
}

export { init };