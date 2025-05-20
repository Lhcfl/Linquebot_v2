const api_addr = 'https://v1.hitokoto.cn/?c='; //网址
async function get_hitokoto(arg = '') {
    try {
        const res = await fetch(api_addr + arg);
        return (await res.json());
    }
    catch (error) {
        return { hitokoto: '网络错误' };
    }
}
const init = (app) => {
    app.registCommand({
        chat_type: 'all',
        command: 'hitokoto',
        handle: async (App, msg, msgTxt) => {
            if (!msgTxt) {
                msgTxt = '';
            }
            const arg = msgTxt.split(' ').join('&c=');
            const res = await get_hitokoto(arg);
            console.log(res);
            void App.bot?.sendMessage(msg.chat.id, `${res.hitokoto} ${res?.from ? '——' + res.from : ''}`, {
                reply_to_message_id: msg.message_id,
            });
        },
        description: '一言',
    });
};
export { init };
//# sourceMappingURL=index.js.map