export interface ITradeInfo {
  pair: string;
  side: 'SELL' | 'BUY';
  type: string;
  quantity: number;
}

export interface ICoin {
  flipped: boolean;
  rate: number;
  stepFrom: string;
  stepTo: string;
  tradeInfo: ITradeInfo;
}

/**
 * 三角组合的边
 */
export interface IEdge {
  pair: string;
  coinFrom: string;
  coinTo: string;
  // 买价
  askPrice: string;
  askQuantity: string;
  // 卖价
  bidPrice: string;
  bidQuantity: string;
}

/**
 * 三角组合
 */
export interface ITriangle {
  a: IEdge;
  b: IEdge;
  c: IEdge;
  // 净利率
  netRate: number;
  // 时间戳
  ts: number;
}
