import readline from 'readline';
const std = {
    questionSync: async function (message, fn) {
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
//# sourceMappingURL=std.js.map