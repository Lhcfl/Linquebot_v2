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

// 创建app

const app: App = {
  db,
  std,
  registCommand,
  registGlobalMessageHandle,
  registReplyHandle,

  config: undefined,

  get version() {
    return JSON.parse(fs.readFileSync('package.json').toString()).version;
  },
  get configExample() {
    return fs.readFileSync('config.example.yml').toString();
  },

  getConfig() {
    return yaml.load(fs.readFileSync('config.yml').toString()) as YamlConfig;
  },
  setConfig(config_data: string) {
    fs.writeFileSync('./config.yml', config_data);
  },
};

if (process.argv[2] === '--version') {
  console.log(`Linquebot ${app.version}`);
  console.log('本程序具有超级琳力');
  process.exit(0);
}

console.log('读取配置文件……');

try {
  app.config = app.getConfig();
} catch (err: any) {
  if (err.errno === -4058) {
    app.config = undefined;
  } else {
    fatalError(err, '读取配置文件失败。');
    process.exit(-1);
  }
}

if (app.config === undefined) {
  await std.questionSync('无配置文件。是否使用默认配置文件config.examle.yml覆盖config.yml (yes)', (answer: any) => {
    if (answer === 'yes') {
      try {
        app.setConfig(app.configExample);
        console.log('写入完成，本程序自动退出。');
      } catch (err) {
        // console.log('写入失败……');
        fatalError(err, '写入配置文件失败。');
        process.exit(-1);
      }
    } else {
      console.log('请正确配置config.yml. 本程序将自动退出.');
    }
    process.exit(0);
  });
}

console.log(app.config);

if (!app.config) exit(-1);

// 创建bot
console.log(`启动来自${app.config.platform.enabled}的bot……`);
const { createBot } = await import(`./bridges/${app.config.platform.enabled}/index.js`);

app.bot = createBot(app.config.platform[app.config.platform.enabled]);

if (!app.bot) exit(-1);

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
async function readPlugin() {
  const subfolders = fs.readdirSync('plugins', { withFileTypes: true }).filter(entry => entry.isDirectory());

  for (const subfolder of subfolders) {
    try {
      console.log(`加载插件 ${subfolder.name}...`);
      const plugin = await import(`./plugins/${subfolder.name}/index.js`);
      plugin.init(app);
    } catch (err) {
      console.error(err);
    }
  }
}

await readPlugin();

function setBotCommand() {
  const botCommands = [];
  // eslint-disable-next-line guard-for-in
  for (const command in getCommands()) {
    botCommands.push({
      command,
      description: getCommands()[command].description,
    });
  }
  app.bot!.setMyCommands(botCommands);
}

setBotCommand();