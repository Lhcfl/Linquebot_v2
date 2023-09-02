/* eslint-disable no-unused-vars */
import { Message } from 'node-telegram-bot-api';
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


export type commandHandleFunction = (app: App, message: Message, message_text?: string) => void;
export type handleFunction = (app: App, message: Message) => void;
export interface CommandConfig {
  /**
   * 命令在哪类聊天中生效。
   * @todo 尚未实现
   */
  chat_type: 'all' | ['pm', 'group'];
  /** 处理函数 */
  handle: commandHandleFunction;
  /** 命令 */
  command: string;
  /** 命令描述 */
  description?: string;
  /** 描述该命令是否在bot off的情况下仍然可以使用。默认false */
  off_mode?: boolean;
}

export function registCommand(config: CommandConfig) {
  commands[config.command] = config;
  // todo
}

export interface MessageHandleConfig {
  chat_type: 'all' | ['pm', 'group'];
  handle: handleFunction;
  /**
   * 必填，描述插件为什么要使用全局消息处理
   */
  description: string;
}
export interface replyHandleConfig {
  chat_type: 'all' | ['pm', 'group'];
  handle: handleFunction;
  description?: string;
}

export function registGlobalMessageHandle(config: MessageHandleConfig) {
  globalMessageHandles.push(config);
}

export function registReplyHandle(config: replyHandleConfig) {
  replyHandles.push(config);
}

/**
 * Parse command
 */
export function commandParser(app: App, message: Message) {
  if (app.config === undefined) {
    console.warn('app.config is undefined');
    return;
  }
  if (message.text?.startsWith(app.config.command_style)) {
    const matched = message.text.substring(app.config.command_style.length).match(/[^\s@]+/);
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
    if (on_off_mode(app, message) === true || commands[cmd].off_mode === true) {
      commands[cmd].handle?.call(undefined, app, message, message_text);
    }
  }
}

/**
 * @returns {{String: CommandConfig}}
 */
export function getCommands(): {
  [key: string]: CommandConfig;
  } {
  return commands;
}

export function getGlobalMessageHandles() {
  return globalMessageHandles;
}

export function getReplyHandles() {
  return replyHandles;
}

export function botOnOffRegister(func: (app: App, message: Message) => boolean) {
  on_off_mode = func;
}

export function botOnOff(app: App, msg: Message):boolean {
  return on_off_mode(app, msg);
}

