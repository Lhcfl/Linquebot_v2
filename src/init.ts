// 读取配置和模块
import fs from 'fs';
import {
  botOnOff,
  commandParser,
  getCommands,
  getGlobalMessageHandles,
  getReplyHandles,
} from '@/lib/command.js';
import { BotCommand } from 'node-telegram-bot-api';
import { Application } from '@/lib/app.js';
import { SuperManager } from '@/lib/super_manager.js';

/** 创建app */
const app = new Application();
/** 初始化app */
await app.init();
/** 初始化超级管理器 */
const superManager = new SuperManager(app);
superManager.init();

app.bot.on('message', (msg) => {
  if (Number(new Date()) / 1000 - msg.date > app.config.outdate_seconds) {
    console.log('古老消息被忽略。详见 config.outdate_seconds');
    return;
  }
  console.log(msg);
  commandParser(app, msg);
  if (botOnOff(app, msg)) {
    for (const cfg of getGlobalMessageHandles()) {
      cfg.handle(app, msg);
    }
    if (msg.reply_to_message) {
      for (const cfg of getReplyHandles()) {
        cfg.handle(app, msg);
      }
    }
  }
});

// 读取插件
async function readPlugin(pluginDir: string) {
  const subfolders = fs
    .readdirSync(pluginDir, { withFileTypes: true })
    .filter((entry) => entry.isDirectory());
  const errs: string[] = [];
  let success: number = 0;
  for (const subfolder of subfolders) {
    try {
      console.log(`> 加载插件 ${subfolder.name}...`);
      const plugin = await import(`./plugins/${subfolder.name}/index.js`);
      plugin.init(app);
      success++;
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
    if (getCommands()[command].premission === 'sysAdmin') {
      continue;
    }
    if (/^[a-z_][a-z0-9_]+$/.test(command)) {
      botCommands.push({
        command,
        description: getCommands()[command].description || '',
      });
    }
  }
  app.bot!.setMyCommands(botCommands);
}

setBotCommand();
