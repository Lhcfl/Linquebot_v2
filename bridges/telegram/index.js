import TelegramBot from 'node-telegram-bot-api';
import proxy from 'proxy-agent';

export function createBot({
  bot_token,
  proxy_address,
}) {
  let bot;
  if (proxy_address) {
    bot = new TelegramBot(bot_token, {
      polling: true,
      request: {
        agent: new proxy.ProxyAgent(proxy_address),
      }
    });
  } else {
    bot = new TelegramBot(bot_token, {
      polling: true,
    });
  }
  return bot;
}