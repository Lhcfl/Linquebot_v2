/**
 * @type {{String: CommandConfig}}
 */
let commands = {};
let globalMessageHandles = [];

/**
 * @typedef {Function} handleFunction
 * @param {import("..").App} app
 * @param {Message} message 消息
 * @param {String} message_text 除去command后的剩余消息
 */
/**
 * @typedef {Function} globalHandleFunction
 * @param {import("..").App} app
 * @param {import("node-telegram-bot-api").Message} message 消息
 */
/**
 * @typedef {Object} CommandConfig
 * @property {"all" | ["pm", "group"]} chat_type - 适用的Chat Type
 * @property {handleFunction} handle - 处理函数
 * @property {String} command - 命令
 * @property {String} description - 命令说明提示
 */
/**
 * 注册命令
 * @param {CommandConfig} config 命令说明
 */
export function registCommand(config) {
  commands[config.command] = config;
  // todo
}

/**
 * @typedef {Object} GlobalMessageHandleConfig
 * @property {"all" | ["pm", "group"]} chat_type - 适用的Chat Type
 * @property {globalHandleFunction} handle - 处理函数
 */
/**
 * @param {GlobalMessageHandleConfig} config
 */
export function registGlobalMessageHandle(config) {
  globalMessageHandles.push(config);
}

/**
 * @typedef {Object} GlobalMessageHandleConfig
 * @property {"all" | ["pm", "group"]} chat_type - 适用的Chat Type
 * @property {globalHandleFunction} handle - 处理函数
 */
/**
 * @param {GlobalMessageHandleConfig} config config
 */
export function registReplyHandle(config) {
  globalMessageHandles.push(config);
}

/**
 * Parse command
 * @param {import("..").App} app App
 * @param {import("node-telegram-bot-api").Message} message TG消息
 */
export function commandParser(app, message) {
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
export function getCommands() {
  return commands;
}