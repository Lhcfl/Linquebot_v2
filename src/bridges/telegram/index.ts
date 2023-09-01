import TelegramBot from 'node-telegram-bot-api';
import proxy from 'proxy-agent';
import { CreateBot } from 'src/types/bridge.js';

/**
 * create Bot
 */
export const createBot: CreateBot = ({
  bot_token,
  proxy_address,
}) => {
  let bot;
  if (proxy_address) {
    bot = new TelegramBot(bot_token, {
      polling: true,
      // TODO: 代理需要考虑protocol问题
      request: {
        agent: new proxy.ProxyAgent({
          protocol: 'http:',
          host: proxy_address,
        }),
        url: `http://${proxy_address}`,
      }
    });
  } else {
    bot = new TelegramBot(bot_token, {
      polling: true,
    });
  }
  return bot;
}