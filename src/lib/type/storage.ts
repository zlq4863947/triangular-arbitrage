import { ITriangle } from './trading';

export interface IStorage {
  // 候选者
  candidates: ICandidte[];
  ranks: IRank[];
  trading: {
    // 套利队列
    queue: any[];
    //套利中的队列
    active: any[];
  };
}

export interface IRank {
  // 用以标识套利组合的唯一标识
  id: string;
  // 套利利率
  rate: number;
  stepA: string;
  stepB: string;
  stepC: string;
  date: Date;
}

/**
 * 交易候补者
 */
export interface ICandidte {
  id: string;
  base: string;
  stepA: string;
  stepB: string;
  stepC: string;
  details: ITriangle;
}
