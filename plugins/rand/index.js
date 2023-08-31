/**
 * @param {import("../..").App} app
 * @param {String} message_text
 * @param {import("node-telegram-bot-api").Message} message
 */
function rand(app, message_text, message) {
  const result = Math.floor(Math.random() * 101);
  let username = message.from?.first_name ? message.from?.first_name : message.from?.username;
  if (message.from?.last_name) {
    username += ' ' + message.from?.last_name;
  }
  if (message_text) {
    app.bot.sendMessage(message.chat.id, `${username} ${message_text} 的概率是: ${result}%`);
  } else {
    app.bot.sendMessage(message.chat.id, `${username} 掷出了: ${result}`);
  }
}

/**
 * @param {import("../..").App} app
 * @param {String} message_text
 * @param {import("node-telegram-bot-api").Message} message
 */
function randwithoutname(app, message_text, message) {
  const result = Math.floor(Math.random() * 101);
  if (message_text) {
    app.bot.sendMessage(message.chat.id, `${message_text} 的概率是: ${result}%`);
  }
}

export function init(app) {
  console.log('rand loaded!');
  app.registCommand({
    chat_type: 'all',
    command: 'rand',
    handle: rand,
    description: 'rand [事件?]：投掷骰子',
  });
  app.registCommand({
    chat_type: 'all',
    command: 'randwithoutname',
    handle: randwithoutname,
    description: 'randwithoutname [事件]：投掷骰子，但不显示投掷者名字',
  });
}