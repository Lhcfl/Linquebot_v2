import TelegramBot from 'node-telegram-bot-api';
import { YamlConfig } from './config.js';
import { registCommand, registGlobalMessageHandle, registReplyHandle } from '@/lib/command.js';

export interface App {
  /** @hidden */
  _config?: YamlConfig;
  /** @hidden */
  _bot?: TelegramBot;
  /**
   * 用户在 config.yml 的配置
   */
  get config(): YamlConfig;
  /**
   * Telegram bot
   */
  get bot(): TelegramBot;

  registCommand: typeof registCommand;
  registGlobalMessageHandle: typeof registGlobalMessageHandle;
  registReplyHandle: typeof registReplyHandle;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  [key: string]: any;
}