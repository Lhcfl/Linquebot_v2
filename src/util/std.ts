import readline from 'readline';

/**
 * 处理函数
 * @param answer 用户的回答
 * @returns 无
 */
export type AnswerFunc = (answer: string) => void;

/**
 * 与stdin stdout的交互接口
 */
export interface Std {
  /**
   * 向控制台输出一个问题，并等待用户输入。用户输入后，调用输入结果
   * @param message 询问的问题
   * @param fn 处理函数
   * @returns 无
   */
  questionSync: (message: string, fn: AnswerFunc) => Promise<void>;
}

const std: Std = {
  questionSync: async function (message, fn): Promise<void> {
    const rd = readline.createInterface({
      input: process.stdin,
      output: process.stdout,
    });
    return new Promise((resolve) => {
      rd.question(message, (answer) => {
        fn(answer);
        rd.close();
        resolve();
      });
    });
  },
};

export default std;
