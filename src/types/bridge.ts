import TelegramBot from 'node-telegram-bot-api';

export type StdBot = TelegramBot;

export type CreateBotOptions = {
  [key: string]: string;
};

export type CreateBot = (options: CreateBotOptions) => StdBot;
