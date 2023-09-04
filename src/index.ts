import child_process from 'child_process';
import { ProcessMessage } from './lib/process.js';
function reload() {
  console.log('启动init');
  const cp = child_process.fork('./init.js');

  cp.on('message', (message) => {
    const msg: ProcessMessage = JSON.parse(String(message));
    if (msg.action === 'reboot') {
      console.log('应用程序发来重启信号，重启中……');
      console.log('-----------------');
      reload();
    }
  });

  cp.on('exit', (code) => {
    console.log(`init.js已退出，退出代码 ${code}`);
  });
}

reload();