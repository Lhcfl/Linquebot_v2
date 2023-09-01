import { Message } from "node-telegram-bot-api";
import { App } from "src/types/app.js";

/**
 * @type {{String: CommandConfig}}
 */
let commands: {
  [key: string]: CommandConfig;
} = {};
let globalMessageHandles: MessageHandleConfig[] = [];
let replyHandles: replyHandleConfig[] = [];


export type commandHandleFunction = (app: App, message: Message, message_text?: string) => void;
export type handleFunction = (app: App, message: Message) => void;
export interface CommandConfig {
  chat_type: "all" | ["pm", "group"];
  handle: commandHandleFunction;
  command: string;
  description?: string;
}

export function registCommand(config: CommandConfig) {
  commands[config.command] = config;
  // todo
}

export interface MessageHandleConfig {
  chat_type: "all" | ["pm", "group"];
  handle: handleFunction;
  /**
   * 必填，描述插件为什么要使用全局消息处理
   */
  description: string;
}
export interface replyHandleConfig {
  chat_type: "all" | ["pm", "group"];
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
    commands[cmd].handle(app, message, message_text);
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

