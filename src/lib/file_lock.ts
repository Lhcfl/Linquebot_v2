import fs from 'fs';
import { EventEmitter } from 'events';

type writeFileFunction = () => void;

class FileLocks {
  private locks: number = 0;
  private queues: { [key: string]: functionQueue } = {};
  private eve = new EventEmitter();
  constructor() {
    this.locks = 0;
    setInterval(() => {
      if (this.locks === 0) {
        this.eve.emit('lock_clear');
      }
    }, 1000);
  }
  find(key: string) {
    if (!this.queues[key]) {
      this.queues[key] = new functionQueue(this);
    }
    return this.queues[key];
  }

  addLock() {
    this.locks++;
  }

  removeLock() {
    if (this.locks >= 1) {
      this.locks--;
    }
    if (this.locks === 0) {
      this.eve.emit('lock_clear');
    }
  }

  /**
   * 被锁住的文件数
   */
  get lockCount() {
    return this.locks;
  }

  get events() {
    return this.eve;
  }
}

const fileLocks = new FileLocks();

class functionQueue {
  private queue: ('running' | writeFileFunction)[] = [];
  private _fl: FileLocks;
  constructor(fl: FileLocks) {
    this._fl = fl;
  }
  push(fn: writeFileFunction) {
    if (this.queue.length === 0) {
      this._fl.addLock();
      this.queue.push('running');
      fn();
      this.queue.shift();
      this._fl.removeLock();
      this.run();
    } else {
      this.queue.push(fn);
      this._fl.addLock();
    }
  }
  run() {
    if (this.queue.length !== 0) {
      if (this.queue[0] === 'running') {
        return;
      } else {
        this.queue[0]();
        this.queue.shift();
        this._fl.removeLock();
        this.run();
      }
    }
  }
}

/**
 * 通过文件锁安全写入文件
 * @param file 要写入的文件
 * @param data 要写入的数据
 * @param options 参见fs.writeFileSync
 */
export async function writeFileSafe(
  file: fs.PathOrFileDescriptor,
  data: string | NodeJS.ArrayBufferView,
  options?: fs.WriteFileOptions,
) {
  fileLocks.find(String(file)).push(() => {
    fs.writeFileSync(file, data, options);
  });
}

/**
 * 获取文件锁模块
 * @returns 文件锁模块
 */
export function getFileLocks() {
  return fileLocks;
}
