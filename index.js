// 读取配置和模块
import fs from 'fs';
// import Promise from 'promise';
import yaml from 'js-yaml';
// import readline from 'readline'
import std from './lib/std.js';
import fatalError from './lib/fatal_error.js';
import db from './lib/db.js';
import registCommand from './lib/regist_command.js';

// 创建app
const app = {
  db,
  std,
  registCommand,

  /** @type {Config} */
  config: {},

  get version() {
    return JSON.parse(fs.readFileSync('package.json')).version;
  },
  get configExample() {
    return fs.readFileSync('config.example.yml');
  },

  getConfig() {
    return yaml.load(fs.readFileSync('config.yml'));
  },
  setConfig(config_data) {
    fs.writeFileSync('./config.yml', config_data);
  },
};

if (process.argv[2] === '--version') {
  console.log(`Linquebot ${app.version}`);
  console.log('本程序具有超级琳力');
  process.exit(0);
}

console.log('读取配置文件……');

/**
 * @typedef {Object} Config_Platform
 * @property {String} enabled Enabled的平台名称
 * @property {Config_Telegram} telegram
 */
/**
 * @typedef {Object} Config_Telegram
 * @property {String} bot_token - "xxxxxxxxxx:xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
 * @property {String} proxy_address - Telegram使用的代理地址
 */
/**
 * @typedef {Object} Config
 * @property {Config_Platform} platform - Platforms
 * @property {[Number]} bot_sysadmin_id - The sysadmin ids of bot
 * @property {String} bot_name - bot的昵称，用于回复中的模式识别
 */

/** @type {Config} */
try {
  app.config = app.getConfig();
} catch (err) {
  if (err.errno === -4058) {
    app.config = undefined;
  } else {
    fatalError(err);
    process.exit(-1);
  }
}

if (app.config === undefined) {
  await std.questionSync('无配置文件。是否使用默认配置文件config.examle.yml覆盖config.yml (yes)', (answer) => {
    if (answer === 'yes') {
      try {
        db.setConfig(db.configExample);
        console.log('写入完成，本程序自动退出。');
      } catch (err) {
        console.log('写入失败……');
        fatalError(err);
        process.exit(-1);
      }
    } else {
      console.log('请正确配置config.yml. 本程序将自动退出.');
    }
    process.exit(0);
  });
}

console.log(app.config);

// 创建bot
console.log(`启动来自${app.config.platform.enabled}的bot……`);
const { createBot } = await import(`./bridges/${app.config.platform.enabled}/index.js`);

app.bot = createBot(app.config.platform[app.config.platform.enabled]);

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