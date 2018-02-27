export interface ITradeInfo {
  symbol: string;
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
