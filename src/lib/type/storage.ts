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
