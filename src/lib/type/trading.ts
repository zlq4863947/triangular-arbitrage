import { Ticker } from 'ccxt';

export interface ITicker extends Ticker {
  askVolume: number;
  bidVolume: number;
}

export interface ITickers {
  [pair: string]: ITicker;
}

/**
 * 三角组合的边
 */
export interface IEdge {
  pair: string;
  coinFrom: string;
  coinTo: string;
  // 交易方向
  side: 'SELL' | 'BUY';
  // 最佳价格
  price: number;
  // 最佳数量
  quantity: number;
  // 兑换率
  conversionRate: number;
}

/**
 * 三角组合
 */
export interface ITriangle {
  // 三角组合唯一id（例:btc-bnb-bcd）
  id: string;
  a: IEdge;
  b: IEdge;
  c: IEdge;
  // 净利率
  netRate: number;
  // 盈利率
  profitRate: number;
  // 时间戳
  ts: number;
}
