import fs from 'fs';

/**
 * 读取文件，如果文件不存在则返回null
 * Default use `{ encoding: 'utf-8' }` as `options`
 * @param fileName filename or file descriptor
 * @param options Options for reading the file
 * @returns string if options.encoding is specified, otherwise `Buffer`
 */
export function readFileIfExists(
  fileName: string,
  options: { encoding: BufferEncoding; flag?: string | undefined } | undefined = {
    encoding: 'utf-8',
  }
) {
  const fileExist = fs.existsSync(fileName);
  if (!fileExist) {
    return null;
  }
  return fs.readFileSync(fileName, options);
}

const defaultDirs = ['./', '../', './config/', '../config/'];

/**
 * 从里到外读取文件，如果文件不存在则返回null
 * Default use `{ encoding: 'utf-8' }` as `options`
 * @param fileName filename or file descriptor
 * @param options Options for reading the file
 * @returns string if options.encoding is specified, otherwise `Buffer`
 */
export function reverseReadFileIfExists(
  fileName: string,
  reverseDirs: string[] = defaultDirs,
  options: { encoding: BufferEncoding; flag?: string | undefined } | undefined = {
    encoding: 'utf-8',
  }
) {
  for (const dir of reverseDirs) {
    const fileContent = readFileIfExists(dir + fileName, options);
    if (fileContent !== null) {
      return fileContent;
    }
  }
  return null;
}
