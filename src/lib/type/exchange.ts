export interface ISupportExchange {
  id: string;
  name: string;
}

export interface IExchangeApi {
  type: 'public' | 'private';
  id: ExchangeId;
  endpoint: any;
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
