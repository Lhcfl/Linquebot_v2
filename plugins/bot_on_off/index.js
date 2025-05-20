import { botOnOffRegister } from '../../lib/command.js';
const bot_off = (app, msg) => {
    void app.db.with_path(['is turned on', msg.chat.id], () => false);
    void app.bot?.sendMessage(msg.chat.id, `${app.config?.bot_name}已关闭`);
};
const bot_on = (app, msg) => {
    void app.db.with_path(['is turned on', msg.chat.id], () => true);
    void app.bot?.sendMessage(msg.chat.id, `${app.config?.bot_name}已开机`);
};
const bot_status = async (app, msg) => {
    void app.bot?.sendMessage(msg.chat.id, (await app.db.peek_path(['is turned on', msg.chat.id], (v) => v))
        ? `${app.config?.bot_name}开机中`
        : `${app.config?.bot_name}关机中`);
};
const init = (app) => {
    console.log('bot_on_off loaded!');
    app.db.register('is turned on', [() => true]);
    botOnOffRegister(async (_, msg) => await app.db.peek_path(['is turned on', msg.chat.id], (val) => val));
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
//# sourceMappingURL=index.js.map