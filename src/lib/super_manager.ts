import { App } from '@/types/app.js';
import { commandHandleFunction } from './command.js';
import process from './process.js';

export class SuperManager {
  reboot: commandHandleFunction = (app, msg) => {
    app.bot.sendMessage(msg.chat.id, '重启中');
    setTimeout(() => {
      process.exit({
        exit_code: 0,
        message: {
          action: 'reboot',
          message: '一名管理员要求重启bot',
        },
      });
    }, 1000);
  };

  private _app: App;
  constructor(app: App) {
    this._app = app;
  }

  init() {
    this._app.registCommand({
      chat_type: 'all',
      premission: 'sysAdmin',
      command: 'reboot',
      description: '重启bot',
      handle: this.reboot,
    });
  }
}
