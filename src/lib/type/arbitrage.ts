import { ICredentials } from './exchange';

export interface IArbitrageOptions {
  display: {
    maxRows: number;
  };
  exchange: {
    active: string;
  };
  arbitrage: {
    start: string;
    baseCoins: string[];
  };
  rank: {
    minRateProfit: number;
    pairTimer: number;
  };
  trading: {
    minQueueRateThreshold: number;
    minHitsThreshold: number;
  };
  account: {
    [exchange: string]: ICredentials;
  };
}
