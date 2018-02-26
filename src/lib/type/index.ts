import { Binance24HrTicker } from './binance';
import { CurrencyCore } from '../currency-core';

export * from './binance';

export interface IPairRank {
  id: string;
  rate: number;
  step_a: string;
  step_b: string;
  step_c: string;
  step_d: string;
  date: Date;
}

/*
export interface ICandidate {

}*/

export interface IArbitrage {
  paths: string[];
  start: string;
}

export interface IBotOptions {
  socket: any;
  arbitrage: IArbitrage;
  trading: {
    paperOnly: boolean;
    minQueuePercentageThreshold: number;
    minHitsThreshold: number;
  };
  UI: {
    title: string;
  };
}

export interface ITradeInfo {
  symbol: string;
  side: 'SELL' | 'BUY';
  type: string;
  quantity: number;
}

export interface ICurrency extends Binance24HrTicker {
  flipped: boolean;
  rate: number;
  stepFrom: string;
  stepTo: string;
  tradeInfo: ITradeInfo;
}

export interface IStream {
  arr: Binance24HrTicker[];
  markets: { [attr: string]: any };
  obj: { [pair: string]: Binance24HrTicker };
}

export interface IStreams {
  [streamId: string]: IStream;
}

export interface IStorage {
  candidates: any[];
  db: any;
  pairRanks: IPairRank[];
  streams: IStreams;
  trading: {
    active: any[];
    queue: any[];
  };
  streamTick: any;
}

export interface ICtrl {
  options: IBotOptions;
  logger: any;
  exchange: any;
  events: any;
  UI: any;
  storage: IStorage;
  currencyCore: CurrencyCore;
}
