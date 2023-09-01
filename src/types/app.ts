import TelegramBot from "node-telegram-bot-api";
import { YamlConfig } from "./config.js";
import { registCommand, registGlobalMessageHandle, registReplyHandle } from "src/lib/command.js";

export interface App {
  config?: YamlConfig;
  bot?: TelegramBot;

  registCommand: typeof registCommand,
  registGlobalMessageHandle: typeof registGlobalMessageHandle,
  registReplyHandle: typeof registReplyHandle,

  [key: string]: any;
}