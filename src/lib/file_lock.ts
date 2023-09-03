import fs from 'fs';
import { EventEmitter } from 'events';

type writeFileFunction = () => void;

class FileLocks {
  locks: number = 0;
  queues: {[key: string]: functionQueue} = {};
  eve = new EventEmitter();
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
    this.locks ++;
  }

  removeLock() {
    if (this.locks >= 1) {
      this.locks --;
    }
    if (this.locks === 0) {
      this.eve.emit('lock_clear');
    }
  }

  get events() {
    return this.eve;
  }
}

const fileLocks = new FileLocks;

class functionQueue {
  private queue: ('running' | writeFileFunction)[] = [];
  private _fl : FileLocks;
  constructor (fl : FileLocks) {
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

export async function writeFileSafe(
  file: fs.PathOrFileDescriptor,
  data: string | NodeJS.ArrayBufferView,
  options?: fs.WriteFileOptions
) {
  fileLocks.find(String(file)).push(() => {
    fs.writeFileSync(file, data, options);
  });
}
export function getFileLocks() {
  return fileLocks;
}