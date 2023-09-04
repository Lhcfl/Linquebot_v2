import TelegramBot from 'node-telegram-bot-api';
import { YamlConfig } from './config.js';
import {
  registCommand,
  registGlobalMessageHandle,
  registReplyHandle,
} from '@/lib/command.js';
import { Std } from '@/util/std.js';

export interface App {
  /**
   * 用户在 config.yml 的配置
   */
  get config(): YamlConfig;
  /**
   * Telegram bot
   */
  get bot(): TelegramBot;
  /**
   * 初始化app。只应执行一次。
   */
  init(): Promise<void>;
  /**
   * 数据库获取
   */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  get db(): any;

  /**
   * 获得标准输入输出交互器
   */
  get std(): Std;

  /**
   * 获取版本号
   */
  get version(): string;

  /**
   * 获取配置示例
   */
  get configExample(): string;

  registCommand: typeof registCommand;
  registGlobalMessageHandle: typeof registGlobalMessageHandle;
  registReplyHandle: typeof registReplyHandle;

  // [key: string]: any;
}
