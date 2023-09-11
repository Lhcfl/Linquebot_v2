import { User } from 'node-telegram-bot-api';

/**
 * 解析代理地址
 */
export const parseProxyUrl = (proxyUrl: string) => {
  const splitted = proxyUrl.split('://');
  if (splitted.length !== 2) {
    throw new Error('Invalid proxy url');
  }
  const [protocol, host] = splitted;
  const [splittedHost, port] = host.split(':');
  return {
    protocol,
    host: host === splittedHost ? host : splittedHost,
    port: port ? parseInt(port, 10) : 80,
  };
};

/**
 * Compose the name of the sender of the message
 */
export function getName(user: User | undefined): string {
  if (!user) return '(anonymous)';
  return (user.first_name ?? user.username ?? '') + (user.last_name ? ' ' + user.last_name : '');
}
