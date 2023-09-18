import TelegramBot from 'node-telegram-bot-api';
import proxy from 'proxy-agent';
import { CreateBot, StdBot } from '@/types/bridge.js';
import { parseProxyUrl } from '@/util/string.js';

class TgBotAdapter extends TelegramBot implements StdBot {
  private spec;
  constructor(token: string, options?: TelegramBot.ConstructorOptions & { spec?: string }) {
    super(token, options);
    this.spec = options?.spec;
  }
  spec_is_me(spec: string): boolean {
    return spec === this.spec;
  }
}

/**
 * 创建TelegramBot
 * @returns new TelegramBot
 */
export const createBot: CreateBot = ({ bot_token, proxy_address, spec }) => {
  let bot;
  if (proxy_address) {
    const { protocol, host, port } = parseProxyUrl(proxy_address);
    bot = new TgBotAdapter(bot_token!, {
      spec,
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
    bot = new TgBotAdapter(bot_token!, {
      spec,
      polling: true,
    });
  }
  return bot;
};
