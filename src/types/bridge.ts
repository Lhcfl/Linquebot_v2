import TelegramBot from 'node-telegram-bot-api';

export type StdBot = TelegramBot & {
  spec_is_me(spec: string): boolean;
};

export type CreateBotOptions = {
  [key in string]?: string;
};

export type CreateBot = (options: CreateBotOptions) => StdBot;
