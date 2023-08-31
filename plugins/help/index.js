import { getCommands } from '../../lib/command.js';

export function init(app) {
  console.log('help loaded!');
  app.registCommand({
    chat_type: 'all',
    command: 'help',
    handle: (App, message) => {
      let help_text = `OoO这里是${App.config.bot_name}的帮助：`;
      // eslint-disable-next-line guard-for-in
      for (const command in getCommands()) {
        help_text += `\n${app.config.command_style}${command} : ${getCommands()[command].description}`;
      }
      App.bot.sendMessage(message.chat.id, help_text);
    },
    description: '显示帮助',
  });
}