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
