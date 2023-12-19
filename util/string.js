/**
 * 解析代理地址
 */
export const parseProxyUrl = (proxyUrl) => {
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
export function getName(user) {
    if (!user)
        return '(anonymous)';
    return (user.first_name ?? user.username ?? '') + (user.last_name ? ' ' + user.last_name : '');
}
/**
 * Replace special characters in the string to fit in a string literal and avoid injections
 * The result should be used in a string constant,
 * or the escapsure is unneeded and the users may not expect to see the escape sequences.
 */
export function escapeLit(str) {
    return str.replaceAll(/[\\'"]/g, (s) => `\\${s}`);
}
//# sourceMappingURL=string.js.map