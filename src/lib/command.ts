import { Message } from "node-telegram-bot-api";
import { App } from "src/types/app.js";

/**
 * @type {{String: CommandConfig}}
 */
let commands: {
  [key: string]: CommandConfig;
} = {};
let globalMessageHandles: GlobalMessageHandleConfig[] = [];
let replyHandles: GlobalMessageHandleConfig[] = [];


type handleFunction = (app: App, message: Message, message_text: String) => void;
type globalHandleFunction = (app: App, message: Message) => void;
interface CommandConfig {
  chat_type: "all" | ["pm", "group"];
  handle: handleFunction;
  command: string;
  description: string;
}

export function registCommand(config: CommandConfig) {
  commands[config.command] = config;
  // todo
}

interface GlobalMessageHandleConfig {
  chat_type: "all" | ["pm", "group"];
  handle: globalHandleFunction;
}

export function registGlobalMessageHandle(config: GlobalMessageHandleConfig) {
  globalMessageHandles.push(config);
}

export function registReplyHandle(config: GlobalMessageHandleConfig) {
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

