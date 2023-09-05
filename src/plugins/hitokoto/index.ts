import { PluginInit } from '@/types/plugin.js';

const api_addr = 'https://v1.hitokoto.cn/?c='; //网址

async function get_hitokoto(arg = '') {
  try {
    const res = await fetch(api_addr + arg);
    return await res.json();
  } catch (error) {
    return { hitokoto: '网络错误' };
  }
}

const init: PluginInit = (app) => {
  app.registCommand({
    chat_type: 'all',
    command: 'hitokoto',
    handle: (App, msg, msgTxt) => {
      if (!msgTxt) {
        msgTxt = '';
      }
      const arg = msgTxt.split(' ').join('&c=');
      get_hitokoto(arg).then((res) => {
        console.log(res);
        App.bot?.sendMessage(
          msg.chat.id,
          `${res.hitokoto} ${res.from ? '——' + res.from : ''}`,
          {
            reply_to_message_id: msg.message_id,
          },
        );
      });
    },
    description: '一言',
  });
};

export { init };
