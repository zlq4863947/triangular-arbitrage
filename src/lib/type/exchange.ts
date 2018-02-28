import { Market } from 'ccxt';

export interface ISupportExchange {
  id: string;
  name: string;
}

export interface IExchange {
  id: ExchangeId;
  endpoint: {
    public?: any;
    private?: any;
  };
  markets?: { [baseCoin: string]: Market[] };
  pairs?: { [pair: string]: Market };
}

export enum ExchangeId {
  KuCoin = 'kucoin',
  Binance = 'binance',
  Bitbank = 'bitbank',
}

export const SupportExchanges = [
  {
    id: ExchangeId.KuCoin,
    name: '库币',
  },
  {
    id: ExchangeId.Binance,
    name: '币安',
  },
  {
    id: ExchangeId.Bitbank,
    name: 'Bitbank',
  },
];

export interface ICredentials {
  apiKey: string;
  secret: string;
}
