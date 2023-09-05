/* eslint-disable no-unused-vars */
import TelegramBot, { BotCommand, Message } from 'node-telegram-bot-api';
import { App } from '@/types/app.js';

/**
 * @type {{String: CommandConfig}}
 */
const commands: {
  [key: string]: CommandConfig;
} = {};
const globalMessageHandles: MessageHandleConfig[] = [];
const replyHandles: replyHandleConfig[] = [];

let on_off_mode: (app: App, msg: Message) => boolean = () => true;

export type commandHandleFunction = (
  app: App,
  message: Message,
  message_text?: string,
) => void;
export type handleFunction = (app: App, message: Message) => void;

export interface CommandConfig {
  /**
   * 描述命令在哪类聊天中生效。
   * 未指定则默认等同于 'all'
   */
  chat_type?: 'all' | TelegramBot.ChatType[];
  /**
   * 描述该命令的适用权限范围
   * 默认 'all'
   * @todo 'groupAdmin' 'groupOwner' 尚未实现
   */
  premission?: 'all' | 'groupAdmin' | 'groupOwner' | 'sysAdmin';
  /**
   * 消息处理函数
   */
  handle: commandHandleFunction;
  /**
   * bot所需要处理的命令。
   * 对于TelegramBot, 1~32字符。只可包含 `a-z`, `0-9` 和下划线 `_`。
   * Text of the command.
   * For TelegramBot, 1-32 characters. Can contain only lowercase English letters, di gits and underscores.
   */
  command: string;
  /**
   * bot所需要处理的命令提示文字。256字以内。
   * Description of the command; 1-256 characters.
   */
  description?: BotCommand['description'];
  /**
   * 描述该命令是否在bot off的情况下仍然可以使用。默认false。
   */
  off_mode?: boolean;
}

/**
 * 注册一个斜杠Bot指令.
 * @param config 请参阅commandConfig
 */
export function registCommand(config: CommandConfig) {
  if (commands[config.command]) {
    throw `存在两个相同的command \`${config.command}\``;
  }
  commands[config.command] = config;
}

export interface MessageHandleConfig {
  /**
   * 描述命令在哪类聊天中生效。
   * 未指定则默认等同于 'all'
   */
  chat_type?: 'all' | TelegramBot.ChatType[];
  /**
   * 消息处理函数
   */
  handle: handleFunction;
  /**
   * 必填，描述插件为什么要使用全局消息处理
   */
  description: string;
}
/**
 * 回复消息处理配置
 */
export interface replyHandleConfig {
  /**
   * 描述命令在哪类聊天中生效。
   * 未指定则默认等同于 'all'
   */
  chat_type?: 'all' | TelegramBot.ChatType[];
  /**
   * 消息处理函数
   */
  handle: handleFunction;
  /**
   *描述插件为什么要使用回复消息处理
   */
  description?: string;
}

/**
 * 注册全局消息处理器
 * @param config MessageHandleConfig
 */
export function registGlobalMessageHandle(config: MessageHandleConfig) {
  globalMessageHandles.push(config);
}

/**
 * 注册回复消息处理器
 * @param config replyHandleConfig
 */
export function registReplyHandle(config: replyHandleConfig) {
  replyHandles.push(config);
}

export interface canUseCommandResult {
  /**
   * 是否成功
   */
  success: boolean;
  /**
   * 若失败，失败原因
   */
  error_message: 'success' | 'permission denied' | 'in the wrong chat';
}
/**
 * 判断此环境是否允许运行command
 * @param app App
 * @param message 消息
 * @param cmd 命令名（string）
 * @returns 是否允许运行
 */
export function canUseCommand(
  app: App,
  message: Message,
  cmd: string,
): canUseCommandResult {
  if (
    commands[cmd].premission === 'sysAdmin' &&
    !(message.from?.id && app.config.bot_sysadmin_id.includes(message.from?.id))
  ) {
    return {
      success: false,
      error_message: 'permission denied',
    };
  }
  if (
    commands[cmd].chat_type &&
    commands[cmd].chat_type !== 'all' &&
    !commands[cmd].chat_type?.includes(message.chat.type)
  ) {
    return {
      success: false,
      error_message: 'in the wrong chat',
    };
  }
  return {
    success: true,
    error_message: 'success',
  };
}

/**
 * Parse command and execute
 */
export function commandParser(app: App, message: Message) {
  if (message.text?.startsWith(app.config.command_style)) {
    const matched = message.text
      .substring(app.config.command_style.length)
      .match(/[^\s@]+/);
    if (!matched) {
      return;
    }
    const cmd = matched[0];
    let message_text;
    const index = message.text.indexOf(' ') + 1;
    if (index) {
      message_text = message.text.substring(index);
    } else {
      message_text = '';
    }
    if (botOnOff(app, message) === true || commands[cmd].off_mode === true) {
      const canUse = canUseCommand(app, message, cmd);
      if (canUse.success) {
        commands[cmd].handle?.call(undefined, app, message, message_text);
      } else {
        if (canUse.error_message === 'permission denied') {
          app.bot.sendMessage(message.chat.id, '您的权限不足');
        }
      }
    }
  }
}

/**
 * 获取所有的注册command。
 * @returns commands
 */
export function getCommands(): {
  [key: string]: CommandConfig;
  } {
  return commands;
}

/**
 * 获取所有的全局消息处理器。
 * @returns globalMessageHandles
 */
export function getGlobalMessageHandles(): MessageHandleConfig[] {
  return globalMessageHandles;
}

/**
 * 获取所有的回复消息处理器。
 * @returns replyHandles
 */
export function getReplyHandles(): replyHandleConfig[] {
  return replyHandles;
}

/**
 * 注册bot on off mode管理器
 * @param func 一个函数，调用后返回当前bot处于打开还是关闭状态
 */
export function botOnOffRegister(
  func: (app: App, message: Message) => boolean,
) {
  on_off_mode = func;
}

/**
 * 询问bot是否处于打开状态
 * @param app App
 * @param msg 调用者传递的消息
 * @returns bot是否处于打开状态
 */
export function botOnOff(app: App, msg: Message): boolean {
  return on_off_mode(app, msg);
}
