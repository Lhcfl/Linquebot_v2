import TelegramBot from 'node-telegram-bot-api';
import proxy from 'proxy-agent';
import { parseProxyUrl } from '../../util/string.js';
class TgBotAdapter extends TelegramBot {
    constructor(token, options) {
        super(token, options);
        this.spec = options?.spec;
    }
    spec_is_me(spec) {
        return spec === this.spec;
    }
}
/**
 * 创建TelegramBot
 * @returns new TelegramBot
 */
export const createBot = ({ bot_token, proxy_address, spec }) => {
    let bot;
    if (proxy_address) {
        const { protocol, host, port } = parseProxyUrl(proxy_address);
        bot = new TgBotAdapter(bot_token, {
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
    }
    else {
        bot = new TgBotAdapter(bot_token, {
            spec,
            polling: true,
        });
    }
    return bot;
};
//# sourceMappingURL=index.js.map