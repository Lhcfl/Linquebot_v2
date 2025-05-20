import process from './process.js';
export class SuperManager {
    constructor(app) {
        this.reboot = (app, msg) => {
            void app.bot.sendMessage(msg.chat.id, '重启中');
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
//# sourceMappingURL=super_manager.js.map