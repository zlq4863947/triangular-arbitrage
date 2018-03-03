import { ICredentials } from './exchange';

export interface IArbitrageOptions {
  display: {
    maxRows: number;
  };
  exchange: {
    active: string;
  };
  arbitrage: {
    interval: number;
    minRateProfit: number;
    start: string;
    baseCoins: string[];
  };
  log: {
    debug: boolean;
  };
  trading: {
    minQueueRateThreshold: number;
    minHitsThreshold: number;
  };
  account: {
    [exchange: string]: ICredentials;
  };
}

export interface IEngineOptions {
  limit: number;
}
