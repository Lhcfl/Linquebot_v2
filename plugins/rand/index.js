import { getName } from '../../util/string.js';
function rand(app, msg, msgTxt) {
    const result = Math.floor(Math.random() * 101);
    const username = getName(msg.from);
    if (msgTxt) {
        if (msgTxt.includes('还是')) {
            const choices = msgTxt.split('还是').filter((a) => a);
            void app.bot.sendMessage(msg.chat.id, `${choices[Math.floor(Math.random() * choices.length)]}!`, {
                reply_to_message_id: msg.message_id,
            });
        }
        else {
            void app.bot.sendMessage(msg.chat.id, `${username} ${msgTxt} 的概率是: ${result}%`);
        }
    }
    else {
        void app.bot.sendMessage(msg.chat.id, `${username} 掷出了: ${result}`);
    }
}
function randnoid(app, msg, msgTxt) {
    const result = Math.floor(Math.random() * 101);
    if (msgTxt) {
        void app.bot.sendMessage(msg.chat.id, `${msgTxt} 的概率是: ${result}%`);
    }
}
function dice(app, msg, txt) {
    const sub = txt?.trim().match(/^(\d+)d(\d+)$/);
    if (!sub || sub.length < 3)
        return void app.bot.sendMessage(msg.chat.id, '只支持xdy的格式');
    if (Number(sub[1]) >= 128)
        return void app.bot.sendMessage(msg.chat.id, '投掷次数不能超过128');
    const res = Array.from({ length: Number(sub[1]) }, () => Math.ceil(Math.random() * Number(sub[2])));
    const sum = res.reduce((a, b) => a + b, 0);
    void app.bot.sendMessage(msg.chat.id, `${getName(msg.from)} 掷出了${sum}: ${res.join(', ')}`);
}
export const init = (app) => {
    console.log('rand loaded!');
    app.registCommand({
        chat_type: 'all',
        command: 'rand',
        handle: rand,
        description: 'rand [事件?]：投掷骰子, 结果是一个百分比',
    });
    app.registCommand({
        chat_type: 'all',
        command: 'randnoid',
        handle: randnoid,
        description: 'randnoid [事件]：投掷骰子, 结果是一个百分比，但不显示投掷者名字',
    });
    app.registCommand({
        chat_type: 'all',
        command: 'dice',
        handle: dice,
        description: 'dice 配置: 投掷骰子, 以xdy的格式投掷x次y面骰子',
    });
};
//# sourceMappingURL=index.js.map