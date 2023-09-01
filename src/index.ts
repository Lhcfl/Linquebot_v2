// 读取配置和模块
import fs from 'fs';
// import Promise from 'promise';
import yaml from 'js-yaml';
// import readline from 'readline'
import std from './lib/std.js';
import fatalError from './lib/fatal_error.js';
import db from './lib/db.js';
import {
  commandParser,
  getCommands,
  getGlobalMessageHandles,
  getReplyHandles,
  registCommand,
  registGlobalMessageHandle,
  registReplyHandle
} from './lib/command.js';
import { App } from './types/app.js';
import { YamlConfig } from './types/config.js';
import { exit } from 'process';
import { BotCommand } from 'node-telegram-bot-api';
import { CreateBot } from './types/bridge.js';
import { reverseReadFileIfExists } from './util/fs.js';

// 创建app
const app: App = {
  db,
  std,
  registCommand,
  registGlobalMessageHandle,
  registReplyHandle,

  config: undefined,

  get version() {
    return JSON.parse(fs.readFileSync('package.json', { encoding: 'utf-8' })).version;
  },
  get configExample() {
    return fs.readFileSync('config.example.yml', { encoding: 'utf-8' }).toString();
  },

  async initConfig() {
    // 读取配置文件
    let configContent = reverseReadFileIfExists('config.yml');
    if (!configContent) {
      await std.questionSync(
        '未找到配置文件。是否使用默认配置文件config.examle.yml覆盖config.yml (yes)',
        (answer) => {
          if (answer === 'yes') {
            try {
              app.setConfig(app.configExample);
              console.log('写入完成，本程序自动退出。');
            } catch (err) {
              fatalError(err, '写入配置文件失败。');
              process.exit(-1);
            }
          } else {
            console.log('请正确配置config.yml. 本程序将自动退出.');
          }
          process.exit(0);
        });
      return;
    }
    this.config = yaml.load(configContent) as YamlConfig;
  },
  writeConfig(config_data: string) {
    fs.writeFileSync('./config.yml', config_data);
  },
};

if (process.argv[2] === '--version') {
  console.log(`Linquebot ${app.version}`);
  console.log('本程序具有超级琳力');
  process.exit(0);
}

// 初始化配置
await app.initConfig();

console.log(app.config);
console.log('---------------');

if (!app.config) exit(-1);

// 创建bot
if (app.config.platform.settings[app.config.platform.enabled] === undefined) {
  console.log(`未找到${app.config.platform.enabled}的配置，请检查config.yml`);
  exit(-1);
}
console.log(`Laauching bot at Platform[${app.config.platform.enabled}]...`);
const createBot = (await import(`./bridges/${app.config.platform.enabled}/index.js`)).createBot as CreateBot;

app.bot = createBot(app.config.platform.settings[app.config.platform.enabled]);

if (!app.bot) {
  console.log('bot创建失败，请检查bridge是否正确。');
  exit(-1);
}

app.bot.on('message', (msg) => {
  console.log(msg);
  commandParser(app, msg);
  for (const cfg of getGlobalMessageHandles()) {
    cfg.handle(app, msg);
  }
  if (msg.reply_to_message) {
    for (const cfg of getReplyHandles()) {
      cfg.handle(app, msg);
    }
  }
});

// 读取插件
async function readPlugin(pluginDir: string) {
  const subfolders = fs.readdirSync(pluginDir, { withFileTypes: true }).filter(entry => entry.isDirectory());
  let errs: string[] = [];
  let success: number = 0;
  for (const subfolder of subfolders) {
    try {
      console.log(`> 加载插件 ${subfolder.name}...`);
      const plugin = await import(`./plugins/${subfolder.name}/index.js`);
      plugin.init(app);
      success ++;
    } catch (err) {
      errs.push(subfolder.name);
      console.error(err);
    }
  }
  console.log(`插件加载完成。成功加载 ${success} 个，失败 ${errs.length} 个`);
  for (const errName of errs) {
    console.log(`  - ${errName}`);
  }
}

await readPlugin('plugins');

function setBotCommand() {
  const botCommands: BotCommand[] = [];
  // eslint-disable-next-line guard-for-in
  for (const command in getCommands()) {
    if (/^[a-zA-Z_][a-zA-Z0-9_]+$/.test(command)) {
      botCommands.push({
        command,
        description: getCommands()[command].description || '',
      });
    }
  }
  app.bot!.setMyCommands(botCommands);
}

setBotCommand();