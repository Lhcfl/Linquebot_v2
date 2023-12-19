function getName(user) {
    let username = user.first_name ? user.first_name : user.username ? user.username : '';
    if (user.last_name) {
        username += ' ' + user.last_name;
    }
    return username;
}
function htmlify(str) {
    if (!str) {
        str = '';
    }
    str = str.replaceAll('&', '&amp;');
    str = str.replaceAll('<', '&lt;');
    str = str.replaceAll('>', '&gt;');
    str = str.replaceAll('"', '&quot;');
    return str;
}
const setTodo = (app, msg, msgTxt) => {
    const ee = msg.reply_to_message?.from || msg.from;
    if (!ee) {
        return;
    }
    if (!msgTxt) {
        void app.bot.sendMessage(msg.chat.id, `需要至少两个参数哦，第一个参数是分钟，第二个参数是${app.config.bot_name}要提醒干什么事`, {
            reply_to_message_id: msg.message_id,
        });
        return;
    }
    msgTxt = msgTxt?.trim();
    const i = msgTxt?.indexOf(' ');
    if (i === -1) {
        if (isNaN(Number(msgTxt))) {
            void app.bot.sendMessage(msg.chat.id, `需要至少两个参数哦，你还没告诉${app.config.bot_name}要多久之后提醒哦`, {
                reply_to_message_id: msg.message_id,
            });
            return;
        }
        else {
            void app.bot.sendMessage(msg.chat.id, `需要至少两个参数哦，你还没有告诉琳酱${app.config.bot_name}要提醒干什么哦`, {
                reply_to_message_id: msg.message_id,
            });
            return;
        }
    }
    else {
        const time = Number(msgTxt.substring(0, i));
        const thing = msgTxt.substring(i + 1);
        if (isNaN(time) || time <= 0) {
            void app.bot.sendMessage(msg.chat.id, `你给${app.config.bot_name}的时间不对，不要调戏${app.config.bot_name}呀`, {
                reply_to_message_id: msg.message_id,
            });
            return;
        }
        void app.bot?.sendMessage(msg.chat.id, htmlify(`设置成功! 将在${time}分钟后提醒`) +
            `<a href="tg://user?id=${ee.id}">${getName(ee)}</a> ${htmlify(thing)}`, {
            parse_mode: 'HTML',
            reply_to_message_id: msg.message_id,
        });
        setTimeout(() => {
            void app.bot?.sendMessage(msg.chat.id, `@${ee.username} 该${thing}啦！`, {
                reply_to_message_id: msg.message_id,
            });
        }, time * 60 * 1000);
    }
};
const init = (app) => {
    app.registCommand({
        chat_type: 'all',
        command: 'todo',
        handle: setTodo,
        description: `todo [分钟] [事件] 设置${app.config.bot_name}定时提醒`,
    });
};
export { init };
//# sourceMappingURL=index.js.map