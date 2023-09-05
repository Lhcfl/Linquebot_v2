/**
 * Database Manager of linquebot
 */

import fs from 'fs';
import path from 'path';
import { writeFileSafe } from './file_lock.js';
// import yaml from 'js-yaml';

/**
 * 判断文件名的路径是否不存在，如果不存在，则创建路径。
 * @param {String} filePath 文件路径
 */
function createDirectoryPath(filePath) {
  const dirname = path.dirname(filePath);
  if (!fs.existsSync(dirname)) {
    fs.mkdirSync(dirname, { recursive: true });
  }
}

/**
 * 写入文件；如果路径不存在，则创建它
 * @param {string} filePath The relative path of file
 * @param {string} data data to write
 */
function safeWriteFile(filePath, data) {
  createDirectoryPath(filePath);
  writeFileSafe(filePath, data);
}
/**
 * 读取文件，如果文件不存在，则创建它，并返回 '{}'
 * @param {String} filePath 文件路径
 * @returns {Buffer | String} 等同于fs.readFileSync
 */
function safeReadFile(filePath) {
  try {
    return fs.readFileSync(filePath);
  } catch (error) {
    safeWriteFile(filePath, '{}');
    return '{}';
  }
}

/**
 * 将文件命去除禁止的字符而安全保存
 * @param {String | Number} fileName 待处理文件名
 * @returns {String} 安全文件名
 */
function safeFileName(fileName) {
  fileName = `${fileName}`;
  fileName = encodeURI(fileName);
  fileName.replaceAll('/', '%-1');
  fileName.replaceAll('*', '%-2');
  fileName.replaceAll('?', '%-3');
  fileName.replaceAll(':', '%-4');
  fileName.replaceAll('|', '%-5');
  fileName.replaceAll('"', '%-6');
  fileName.replaceAll('\'', '%-7');
  fileName.replaceAll('<', '%-8');
  fileName.replaceAll('>', '%-9');
  return fileName;
}

/**
 * 数据库类
 */
class DB {
  /**
   * constructor
   * @param {String} filePath DB file path
   */
  constructor(filePath) {
    this._filePath = filePath;
    this._getFromDB();
    for (const key in UserDB._defaultObject) {
      if (this._raw_db_obj[key] === undefined) {
        this._raw_db_obj[key] = UserDB._defaultObject[key];
      }
    }
  }
  format(obj) {
    if (typeof obj === 'object') {
      this._raw_db_obj = obj;
    }
    this._updateDB();
  }
  _updateDB() {
    safeWriteFile(this._filePath, JSON.stringify(this._raw_db_obj));
  }
  _getFromDB() {
    try {
      this._raw_db_obj = JSON.parse(safeReadFile(this._filePath));
    } catch (err) {
      console.error(err);
    }
  }
}
DB._defaultObject = {};
DB.handler = {
  set(target, key, value) {
    if (typeof target[key] === 'function') {
      return true;
    }
    target._raw_db_obj[key] = value;
    target._updateDB();
    return true;
  },
  get(target, key) {
    if (typeof target[key] === 'function') {
      return function (...args) {
        return target[key](args);
      };
    }
    return target._raw_db_obj[key];
  },
};
/**
 * Set the default object of DB
 * @param {DB | ChatDB | UserDB | GroupUserDB } db_class DB class
 * @param {Object} obj The default object
 */
function setDefault(db_class, obj) {
  if (typeof obj === 'object') {
    db_class._defaultObject = Object.assign({}, db_class._defaultObject, obj);
  }
}

class UserDB extends DB {
  constructor(uid) {
    super(`../data/users/${safeFileName(uid)}.json`);
    this._uid = uid;
  }
}
class GroupUserDB extends DB {
  constructor(chatId, uid) {
    super(`../data/${safeFileName(chatId)}/users/${safeFileName(uid)}.json`);
    this._uid = uid;
    this._chatId = chatId;
  }
}

/**
 * Database per chat
 */
class ChatDB extends DB {
  _chatId;
  _user_caches = {};
  constructor(chatId) {
    super(`../data/${safeFileName(chatId)}/main.json`);
    this._chatId = chatId;
  }
  /**
   * Get user from user id
   * @param {Number | String} uid user id
   */
  user(uid) {
    if (!this._user_caches[uid]) {
      this._user_caches[uid] = new Proxy(
        new GroupUserDB(this._chatId, uid),
        GroupUserDB.handler,
      );
    }
    return this._user_caches[uid];
  }
}

const db = {
  _chat_caches: {},
  _user_caches: {},
  chat(chatId) {
    if (!this._chat_caches[chatId]) {
      this._chat_caches[chatId] = new Proxy(new ChatDB(chatId), ChatDB.handler);
    }
    return this._chat_caches[chatId];
  },
  user(uid) {
    if (!this._user_caches[uid]) {
      this._user_caches[uid] = new Proxy(new UserDB(uid), UserDB.handler);
    }
    return this._user_caches[uid];
  },
  get bot() {
    return this.chat('linquebot_database');
  },
};

export default db;
export { DB, UserDB, ChatDB, GroupUserDB, db, safeFileName, setDefault };
