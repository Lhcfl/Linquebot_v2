/**
 * Handle and output fatal error messages
 * @param {error} error The error
 * @param {string | undefined} message The message to output
 */
export default function logFatalError(error, message) {
  if (message) {
    console.log('---------------');
    console.log(`致命错误：${message}`);
  } else {
    console.log('---------------');
    console.log('致命错误，以下为详细信息：');
    console.error(error);
  }
}
