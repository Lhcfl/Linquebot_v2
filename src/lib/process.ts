import Process from 'process';
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
 * 退出进程
 * @param info 退出信息/退出码
 * @todo 提防关闭时引发数据库错误
 */
function exit(info: ExitInfo | number) {
  if (typeof info === 'number') {
    Process.exit(info);
  }
  if (Process.send) {
    Process.send(JSON.stringify(info.message || {}));
  }
  Process.exit(info.exit_code);
}

export default {
  exit,
};