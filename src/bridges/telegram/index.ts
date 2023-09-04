import TelegramBot from 'node-telegram-bot-api';
import proxy from 'proxy-agent';
import { CreateBot } from '@/types/bridge.js';
import { parseProxyUrl } from '@/util/string.js';

/**
 * 创建TelegramBot
 * @returns new TelegramBot
 */
export const createBot: CreateBot = ({ bot_token, proxy_address }) => {
  let bot;
  if (proxy_address) {
    const { protocol, host, port } = parseProxyUrl(proxy_address);
    bot = new TelegramBot(bot_token, {
      polling: true,
      request: {
        agent: new proxy.ProxyAgent({
          protocol,
          host,
          port,
        }),
        url: proxy_address,
      },
    });
  } else {
    bot = new TelegramBot(bot_token, {
      polling: true,
    });
  }
  return bot;
};
