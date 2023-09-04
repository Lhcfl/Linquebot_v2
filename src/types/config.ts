export interface YamlConfig {
  platform: {
    enabled: string;
    settings: {
      // telegram?: TelegramPlatform;
      // qq?: QQPlatform;
      [platform: string]: UnknownPlatform;
    };
  };
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
  command_style: '/' | '.';
  /**
   * 由于一场关机导致轮询时爬取古老消息，记作超时不处理的消息最短时间（秒）
   */
  outdate_seconds: number;
}

export interface TelegramPlatform {
  bot_token: string;
  /**
   * 代理地址
   */
  proxy_address?: string;
}

export interface QQPlatform {
  username: string;
  password: string;
}

export interface UnknownPlatform {
  [key: string]: string;
}
