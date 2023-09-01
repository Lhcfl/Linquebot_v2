import fs from 'fs';

/**
 * 读取文件，如果文件不存在则返回null
 */
export const readFileIfExists = (fileName: string) => {
  const fileExist = fs.existsSync(fileName);
  if (!fileExist) return null;
  return fs.readFileSync(fileName, { encoding: 'utf-8' });
}

const defaultDirs = [
  './',
  '../',
  './config/',
  '../config/'
]

/**
 * 从里到外读取文件，如果文件不存在则返回null
 */
export const reverseReadFileIfExists = (fileName: string, reverseDirs: string[] = defaultDirs) => { 
  for (const dir of reverseDirs) {
    const fileContent = readFileIfExists(dir + fileName);
    if (fileContent !== null) return fileContent; 
  }
  return null;
}