import Process from 'process';
import { getFileLocks } from './file_lock.js';
/**
 * 向父进程发送的消息
 */
export interface ProcessMessage {
  /**
   * 退出动作
   */
  action?: 'reboot' | 'shutdown';
  /**
   * 退出时发送的消息
   */
  message?: string;
}
export interface ExitInfo {
  /**
   * 进程退出码
   */
  exit_code: number;

  /**
   * 向父亲进程发送的消息
   */
  message?: ProcessMessage;
}

/**
 * 等待文件写完，然后关闭
 * @param info 退出信息/退出码
 */
function waitFileAndExit(info: ExitInfo | number) {
  getFileLocks().events.on('lock_clear', () => {
    console.log('?');
    if (typeof info === 'number') {
      Process.exit(info);
    }
    if (Process.send) {
      Process.send(JSON.stringify(info.message || {}));
    }
    Process.exit(info.exit_code);
  });
}

/**
 * 退出进程
 * @param info 退出信息/退出码
 */
function exit(info: ExitInfo | number) {
  waitFileAndExit(info);
}

export default {
  exit,
};
