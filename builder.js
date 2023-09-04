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

function logCommand(message, func) {
  console.log(message);
  try {
    func();
  } catch (error) {
    console.log(chalk.red('[ERROR]'));
    console.log('--------------------------');
    if (error.stdout) {
      console.log(error.stdout.toString());
      throw error.message;
    } else {
      throw error;
    }
  }
}

commands.forEach((c) => {
  logCommand('> ' + c, () => {
    execSync(c, { stdio: 'inherit' });
  });
});

console.log('Build complete.');
