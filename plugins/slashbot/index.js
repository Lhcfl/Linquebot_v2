import { getName } from '../../util/string.js';
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
const rong = (app, msg, msgTxt, rev) => {
    msgTxt = htmlify(msgTxt?.trim());
    if (msgTxt === '') {
        msgTxt = 'rong了';
    }
    if (typeof msgTxt === 'string' && msgTxt.length >= 1) {
        let a = getName(msg.from);
        let b = undefined;
        let bid = msg.from?.id;
        if (msg.reply_to_message) {
            b = getName(msg.reply_to_message.from);
            bid = msg.reply_to_message.from?.id;
        }
        if (a === b || b === undefined) {
            b = '自己';
        }
        a = htmlify(a);
        b = htmlify(b);
        let A = `<a href="tg://user?id=${msg.from?.id}">${a}</a>`;
        let B = `<a href="tg://user?id=${bid}">${b}</a>`;
        if (rev) {
            [A, B] = [B, A];
        }
        const i = msgTxt?.indexOf(' ');
        if (i === -1) {
            void app.bot?.sendMessage(msg.chat.id, `${A} ${msgTxt} ${B}!`, {
                parse_mode: 'HTML',
                reply_to_message_id: msg.message_id,
            });
        }
        else {
            void app.bot?.sendMessage(msg.chat.id, `${A} ${msgTxt.substring(0, i)} ${B} ${msgTxt.substring(i + 1)}!`, {
                parse_mode: 'HTML',
                reply_to_message_id: msg.message_id,
            });
        }
    }
};
const init = (app) => {
    console.log('rongBot loaded!');
    app.registCommand({
        chat_type: 'all',
        command: 'rong',
        handle: (Appl, msg, msgTxt) => {
            rong(Appl, msg, msgTxt);
        },
        description: 'rong [str1?] [str2?] rong一下！',
    });
    app.registCommand({
        chat_type: 'all',
        command: 'gnor',
        handle: (Appl, msg, msgTxt) => {
            rong(Appl, msg, msgTxt, true);
        },
        description: 'gnor [str1?] [str2?] 被rong一下！',
    });
};
export { init };
//# sourceMappingURL=index.js.map