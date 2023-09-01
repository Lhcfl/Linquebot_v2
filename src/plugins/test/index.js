export function init(app) {
  console.log('test loaded!');
  app.registReplyHandle({
    chat_type: 'all',
    handle: (App, msg) => {
      App.bot.sendMessage(msg.chat.id, '喵？你回复我了吗？');
    },
  });
}