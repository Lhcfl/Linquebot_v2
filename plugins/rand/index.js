function rand(app, message_text, message) {
  const result = Math.floor(Math.random() * 101);
  app.bot.sendMessage(`${message.username} ${message_text} 的概率是: ${result}%`);
}

export function init(app) {
  console.log('rand loaded!');
  app.registCommand({
    chat_type: 'all',
    command: 'rand',
    handle: rand,
  });
}