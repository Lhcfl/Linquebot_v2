import { App } from '@/types/app.js';
import tarots from './lib/tarots.json' assert { type: 'json' };

/**
 * 获得一组塔罗牌
 * @param arg - 字符串，描述摸牌数,
 * where the first item is the weight to be selected, the rest are the messages.
 * @returns list of tarots
 */
export function getTarots(app: App, arg?: string | number): string {
  const tarotSet: {
    [key: string]: { name: string; cis: string; trans: string } | undefined;
  } = {};
  for (const tarot of tarots) {
    tarotSet[tarot.name] = tarot;
  }
  /**
   * 获得单张不重复塔罗牌
   * @returns string of tarots
   */
  function get_one_tarot(): string {
    let res: string = '';
    const k = Object.keys(tarotSet);
    if (k.length === 0) {
      return '没牌啦！';
    }
    const t = k[Math.floor(Math.random() * k.length)];
    res =
      Math.random() < 0.5
        ? `${tarotSet[t]?.name} 顺位：\n${tarotSet[t]?.cis}`
        : `${tarotSet[t]?.name} 逆位：\n${tarotSet[t]?.trans}`;
    delete tarotSet[t];
    return res;
  }
  const num = Number(arg);
  if (isNaN(num) || num < 1) {
    return `数字不对，不准乱玩${app.config?.bot_name}哦！`;
  }
  if (num > 5) {
    return '不行，你点的牌太多啦！';
  }
  let res = get_one_tarot();
  for (let i = 2; i <= num; i++) {
    res += '\n' + get_one_tarot();
  }
  return res;
}
