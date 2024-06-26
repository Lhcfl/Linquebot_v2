import Process from 'process';
import { getFileLocks } from './file_lock.js';
/**
 * 等待文件写完，然后关闭
 * @param info 退出信息/退出码
 */
function waitFileAndExit(info) {
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
function exit(info) {
    waitFileAndExit(info);
}
export default {
    exit,
};
//# sourceMappingURL=process.js.map