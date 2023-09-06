import child_process from 'child_process';
import { ProcessMessage } from './lib/process.js';
import path from 'path';
import process from 'process';

function reload() {
  console.log('启动init');
  process.chdir(path.dirname(new URL(import.meta.url).pathname));
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
