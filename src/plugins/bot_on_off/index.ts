import { botOnOffRegister, commandHandleFunction } from '../../lib/command.js';
import { PluginInit } from '../../types/plugin.js';

const bot_off: commandHandleFunction = (app, msg) => {
  void app.db.with_path(['is turned on', msg.chat.id], () => false);
  void app.bot?.sendMessage(msg.chat.id, `${app.config?.bot_name}已关闭`);
};
const bot_on: commandHandleFunction = (app, msg) => {
  void app.db.with_path(['is turned on', msg.chat.id], () => true);
  void app.bot?.sendMessage(msg.chat.id, `${app.config?.bot_name}已开机`);
};
const bot_status: commandHandleFunction = async (app, msg) => {
  void app.bot?.sendMessage(
    msg.chat.id,
    (await app.db.with_path(['is turned on', msg.chat.id], (v) => v))
      ? `${app.config?.bot_name}关机中`
      : `${app.config?.bot_name}开机中`
  );
};

const init: PluginInit = (app) => {
  console.log('xxx loaded!');
  app.db.register('is turned on', [() => true]);
  botOnOffRegister(
    async (_, msg) =>
      await app.db.with_path<boolean>(['is turned on', msg.chat.id], (val) => val)
  );
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
