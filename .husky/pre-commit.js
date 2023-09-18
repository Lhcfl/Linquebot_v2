import cp from 'child_process';

let endproc = 0;
let doexit;
const fin = new Promise((res) => (doexit = res));

const procList = [
  // Force wrapping (
  'eslint . --ext .ts,.js --color',
  'prettier -c .',
  'tsc --pretty && tsc-alias',
  'jest --color true',
].map(startProc);
const totproc = procList.length;

/**
 * @param {string} cmd
 */
function startProc(cmd) {
  const proc = cp.exec(cmd, (err, stdout, stderr) => {
    if (err) {
      console.error(`Error when executing ${cmd}:`);
      console.error(stdout);
      console.error(stderr);
      for (const p of procList) p.kill();
      doexit(1);
    } else {
      console.log(`${cmd} Done without error.`);
      if (++endproc === totproc) doexit(0);
    }
  });
  return proc;
}

process.exit(await fin);
