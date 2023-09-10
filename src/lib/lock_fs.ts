/**
 * Read or write a file with a lock and logs, to keep its integrity.
 * @module lock_fs
 */

import fs from 'fs/promises';
import path from 'path';

const lock: { [fname: string]: { locked: boolean; wakerq: (() => void)[] } } = {};

async function readable(fname: string): Promise<boolean> {
  try {
    await fs.access(fname, fs.constants.R_OK);
    return true;
  } catch (e) {
    return false;
  }
}

class FileLock implements AsyncDisposable {
  static async get(fname: string): Promise<FileLock> {
    if (!(fname in lock)) lock[fname] = { locked: false, wakerq: [] };
    if (lock[fname].locked) await new Promise<void>((res) => lock[fname].wakerq.push(res));
    else lock[fname].locked = true;
    return new FileLock(fname);
  }
  fname: string;
  constructor(fname: string) {
    this.fname = fname;
  }
  async [Symbol.asyncDispose](): Promise<void> {
    const waker = lock[this.fname].wakerq.shift();
    if (waker) waker();
    else lock[this.fname].locked = false;
  }
}

/**
 * Read data from a file with locks and logs.
 *
 * Several backups and helper files used for logging are recognized,
 * should be used in pair with [`write`]().
 *
 * @param fname the name of the file
 * @returns data read from the file
 */
export async function read(fname: string): Promise<Buffer> {
  // So why isn't there using expressions or using statement without variable name???
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  await using _ = await FileLock.get(fname);
  if (await readable(`${fname}-writing`)) {
    await fs.copyFile(`${fname}-backup`, fname);
    await fs.rm(`${fname}-writing`);
  }
  if (await readable(fname)) return await fs.readFile(fname);
  else return Buffer.from('', 'utf8');
}

/**
 * Write data to a file with locks and logs.
 *
 * Several backups and helper files used for logging are created,
 * should be used in pair with [`read`]().
 *
 * @param fname the name of the file
 * @param data the data to write to the file
 */
export async function write(fname: string, data: Buffer | string): Promise<void> {
  // So why isn't there using expressions or using statement without variable name???
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  await using _ = await FileLock.get(fname);
  await fs.mkdir(path.dirname(fname));
  await fs.copyFile(fname, `${fname}-backup`);
  await fs.writeFile(`${fname}-writing`, '');
  await fs.writeFile(fname, data);
  await fs.rm(`${fname}-writing`);
  await fs.rm(`${fname}-backup`);
}

export default { read, write };
