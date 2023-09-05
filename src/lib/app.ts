// 读取配置和模块
// import Promise from 'promise';
import yaml from 'js-yaml';
// import readline from 'readline'
import std from '@/util/std.js';
import fatalError from '@/util/fatal_error.js';
import db from '@/lib/db.js';
import {
  registCommand,
  registGlobalMessageHandle,
  registReplyHandle,
} from '@/lib/command.js';
import { App } from '@/types/app.js';
import { YamlConfig } from '@/types/config.js';
import process from '@/lib/process.js';
import TelegramBot from 'node-telegram-bot-api';
import { CreateBot } from '@/types/bridge.js';
import { reverseReadFileIfExists } from '@/util/fs.js';
import chalk from 'chalk';
import { writeFileSafe } from './file_lock.js';

/**
 * `@/types/app.ts` 的 App 实现
 */
export class Application implements App {
  private _bot?: TelegramBot;
  private _config?: YamlConfig;
  private _configExample: string;
  private _version: string;

  constructor() {
    const packageJSON = reverseReadFileIfExists('package.json');
    if (packageJSON) {
      this._version = JSON.parse(packageJSON).version;
    } else {
      throw 'no version found';
    }
    try {
      this._configExample = reverseReadFileIfExists('config.example.yml') || '';
      if (!this._configExample) {
        throw 'no config example found';
      }
    } catch (err) {
      this._configExample = '';
      console.warn(
        chalk.yellow(
          'No config.example.yml found. This program will not be able to provide a config example.',
        ),
      );
    }
  }

  async init(): Promise<void> {
    console.log('Reading config.yml ...');
    await this.initConfig();
    console.log(this.config);
    console.log('---------------');
    console.log('Initializing bot ...');
    if (
      this.config.platform.settings[this.config.platform.enabled] === undefined
    ) {
      console.log(
        `未找到平台${this.config.platform.enabled}的配置，请检查config.yml`,
      );
      process.exit(-1);
    }
    console.log(
      `Launching bot at Platform[${this.config.platform.enabled}]...`,
    );

    const createBot = (
      await import(`../bridges/${this.config.platform.enabled}/index.js`)
    ).createBot as CreateBot;

    try {
      this._bot = createBot(
        this.config.platform.settings[this.config.platform.enabled],
      );
      if (!this._bot) {
        throw 'bot is undefined';
      }
    } catch (err) {
      console.log(`-------${chalk.red('[ERROR]')}--------`);
      console.log(
        'Launching bot failed. Please check the error information below:',
      );
      console.error(err);
      process.exit(-1);
    }
    console.log('---------------');
  }

  get config(): YamlConfig {
    if (this._config) {
      return this._config;
    } else {
      throw '未找到config';
    }
  }

  get bot(): TelegramBot {
    if (this._bot) {
      return this._bot;
    } else {
      throw '无bot被初始化';
    }
  }

  get db() {
    return db;
  }

  get std() {
    return std;
  }

  get version(): string {
    return this._version;
  }
  get configExample() {
    return this._configExample;
  }

  private async initConfig() {
    // 读取配置文件
    const configContent = reverseReadFileIfExists('config.yml');
    if (!configContent) {
      await std.questionSync(
        '未找到配置文件。是否使用默认配置文件config.examle.yml覆盖config.yml (yes)',
        (answer) => {
          if (answer === 'yes') {
            try {
              this.writeConfig(this.configExample);
              console.log('写入完成，本程序自动退出。');
            } catch (err) {
              fatalError(err, '写入配置文件失败。');
              process.exit(-1);
            }
          } else {
            console.log('请正确配置config.yml. 本程序将自动退出.');
          }
          process.exit(0);
        },
      );
      return;
    }
    this._config = yaml.load(configContent) as YamlConfig;
  }

  private writeConfig(config_data: string) {
    writeFileSafe('./config.yml', config_data);
  }

  get registCommand() {
    return registCommand;
  }
  get registGlobalMessageHandle() {
    return registGlobalMessageHandle;
  }
  get registReplyHandle() {
    return registReplyHandle;
  }
}
