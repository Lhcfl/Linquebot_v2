import TelegramBot from "node-telegram-bot-api";
import { YamlConfig } from "./config.js";

export interface App {
  config?: YamlConfig;
  bot?: TelegramBot;
  [key: string]: any;
}