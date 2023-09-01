export interface YamlConfig {
  platform: {
    enabled: string;
    settings: {
      // telegram?: TelegramPlatform;
      // qq?: QQPlatform;
      [platform: string]: UnknownPlatform;
    };
  }
  /**
   * The sysadmin ids of bot
   */
  bot_sysadmin_id: number[];
  /**
   * bot的昵称，用于回复中的模式识别
   */
  bot_name: string;
  /**
   * TG风格： "/" QQ风格： "." 
   */
  command_style: "/" | ".";
}

interface TelegramPlatform {
  bot_token: string;
  /**
   * 代理地址
   */
  proxy_address?: string;
}

interface QQPlatform {
  username: string;
  password: string;
}

interface UnknownPlatform {
  [key: string]: string;
}