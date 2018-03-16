import { ITriangle } from './trading';

export interface IRank {
  stepA: string;
  stepB: string;
  stepC: string;
  rate: number;
  fee: number[];
  profitRate: number[];
  ts: number;
}

/**
 * 三角组合边的成交记录
 */
export interface ITradeEdge {
  pair: string;
  side: 'buy' | 'sell';
  // 成交价格
  price: number;
  // 报单数量
  amount: number;
  // 手续费（未折扣）
  fee: string;
  orderId: string;
  status: 'open' | 'closed' | 'canceled';
  // 用时
  timecost: string;
}

export interface ITradeTriangle {
  // 三角组合唯一id（例:btc-bnb-bcd）
  id: string;
  a: ITradeEdge;
  b: ITradeEdge;
  c: ITradeEdge;
  // 套利货币
  coin: string;
  exchange: string;
  // 起始买入资金
  before: number;
  // 套利后获得资金
  after: number;
  profit: string;
  rate: string;
  ts: number;
}

export type tradeStep = 0 | 1 | 2;

export interface ITrade {
  _id?: string;
  real?: ITradeTriangle;
  mock: ITradeTriangle;
}

export interface IQueue {
  _id?: string;
  _rev?: string;
  triangleId: string;
  exchange: string;
  step: tradeStep;
  ts?: number;
}
