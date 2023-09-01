/** Build Typesctipt file */

const commands = [
  'npx tsc',
  'cp config.yml dist/config.yml',
  'cp config.example.yml dist/config.example.yml',
];

/*****************************************/

// import fs from 'fs';
// import path from 'path';
import { execSync } from 'child_process';
import chalk from 'chalk';

function logCommand(message, func, ed = ' ...' + chalk.green('[OK]')) {
  process.stdout.write(message);
  try {
    func();
    console.log(ed);
  } catch (error) {
    console.log(chalk.red('[ERROR]'));
    console.log('--------------------------');
    throw error;
  }
}

commands.forEach((c) => {
  logCommand(c, () => {
    execSync(c);
  });
});

console.log('Build complete.');