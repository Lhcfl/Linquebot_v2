import { botOnOffRegister, commandHandleFunction } from '../../lib/command.js';
import db from '../../lib/db.js';
import { PluginInit } from '../../types/plugin.js';

const bot_off: commandHandleFunction = (app, msg) => {
  db.chat(msg.chat.id).turned_off = true;
  app.bot?.sendMessage(msg.chat.id, `${app.config?.bot_name}已关闭`);
};
const bot_on: commandHandleFunction = (app, msg) => {
  db.chat(msg.chat.id).turned_off = false;
  app.bot?.sendMessage(msg.chat.id, `${app.config?.bot_name}已开机`);
};
const bot_status: commandHandleFunction = (app, msg) => {
  app.bot?.sendMessage(
    msg.chat.id,
    db.chat(msg.chat.id).turned_off
      ? `${app.config?.bot_name}关机中`
      : `${app.config?.bot_name}开机中`,
  );
};

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
  });
  app.registCommand({
    description: '查询bot当前开关机状态',
    chat_type: 'all',
    handle: bot_status,
    command: 'bot_status',
    off_mode: true,
  });
};

export { init };
