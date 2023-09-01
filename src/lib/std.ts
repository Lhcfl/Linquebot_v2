import readline from 'readline';

type AnswerFunc = (answer: string) => void;

interface Std {
  questionSync: (message: string, fn: AnswerFunc) => Promise<void>;
}

const std: Std = {
  questionSync: async function(message, fn): Promise<void> {
    const rd = readline.createInterface({
      input: process.stdin,
      output: process.stdout
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