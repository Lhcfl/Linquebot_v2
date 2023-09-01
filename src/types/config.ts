export interface YamlConfig {
  platform: {
    enabled: string;
    [key: string]: Platform | string;
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

interface Platform {
  bot_token: string;
  /**
   * 代理地址
   */
  proxy_address?: string;
}