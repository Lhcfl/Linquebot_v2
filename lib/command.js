/**
 * 变量区
 */
const commands = {};
const globalMessageHandles = [];
const replyHandles = [];
/**
 * 计算bot on和off的状态
 */
let on_off_mode = () => true;
/**
 * 注册一个斜杠Bot指令.
 * @param config 请参阅commandConfig
 */
export function registCommand(config) {
    if (commands[config.command]) {
        throw `存在两个相同的command \`${config.command}\``;
    }
    commands[config.command] = config;
}
/**
 * 注册全局消息处理器
 * @param config MessageHandleConfig
 */
export function registGlobalMessageHandle(config) {
    globalMessageHandles.push(config);
}
/**
 * 注册回复消息处理器
 * @param config replyHandleConfig
 */
export function registReplyHandle(config) {
    replyHandles.push(config);
}
/**
 * 判断此环境是否允许运行command
 * @param app App
 * @param message 消息
 * @param cmd 命令名（string）
 * @returns 是否允许运行
 */
export function canUseCommand(app, message, cmd) {
    if (commands[cmd].premission === 'sysAdmin' &&
        !(message.from?.id && app.config.bot_sysadmin_id.includes(message.from?.id))) {
        return {
            success: false,
            error_message: 'permission denied',
        };
    }
    if (commands[cmd].chat_type &&
        commands[cmd].chat_type !== 'all' &&
        !commands[cmd].chat_type?.includes(message.chat.type)) {
        return {
            success: false,
            error_message: 'in the wrong chat',
        };
    }
    return {
        success: true,
        error_message: 'success',
    };
}
/**
 * Parse command and execute
 */
export async function commandParser(app, message) {
    if (message.text?.startsWith(app.config.command_style)) {
        const matched = message.text
            .substring(app.config.command_style.length)
            .match(/([^\s@]+)(@\S+)?/);
        if (!matched) {
            return;
        }
        const botspec = matched[2]?.substring(1);
        if (botspec && !app.bot.spec_is_me(botspec))
            return;
        const cmd = matched[1];
        if (!(cmd in commands)) {
            if (botspec)
                void app.bot.sendMessage(message.chat.id, `无法识别的命令: ${cmd}`);
            return;
        }
        let message_text;
        const index = message.text.indexOf(' ') + 1;
        if (index) {
            message_text = message.text.substring(index);
        }
        else {
            message_text = '';
        }
        if ((await botOnOff(app, message)) === true || commands[cmd].off_mode === true) {
            const canUse = canUseCommand(app, message, cmd);
            if (canUse.success) {
                await commands[cmd].handle?.call(undefined, app, message, message_text);
            }
            else {
                if (canUse.error_message === 'permission denied') {
                    await app.bot.sendMessage(message.chat.id, '您的权限不足');
                }
            }
        }
    }
}
/**
 * 获取所有的注册command。
 * @returns commands
 */
export function getCommands() {
    return commands;
}
/**
 * 获取所有的全局消息处理器。
 * @returns globalMessageHandles
 */
export function getGlobalMessageHandles() {
    return globalMessageHandles;
}
/**
 * 获取所有的回复消息处理器。
 * @returns replyHandles
 */
export function getReplyHandles() {
    return replyHandles;
}
/**
 * 注册bot on off mode管理器
 * @param func 一个函数，调用后返回当前bot处于打开还是关闭状态
 */
export function botOnOffRegister(func) {
    on_off_mode = func;
}
/**
 * 询问bot是否处于打开状态
 * @param app App
 * @param msg 调用者传递的消息
 * @returns bot是否处于打开状态
 */
export async function botOnOff(app, msg) {
    return Boolean(await on_off_mode(app, msg));
}
//# sourceMappingURL=command.js.map