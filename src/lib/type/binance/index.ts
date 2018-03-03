export interface Binance24HrTicker {
  eventType: string; // "24hrTicker",   Event type
  eventTime: number; // 123456789,    Event time
  symbol: string; // "BNBBTC",       Symbol
  priceChange: string; // "0.0015",       Price change
  priceChangePercent: string; // "250.00",       Price change percent
  weightedAveragePrice: string; // "0.0018",       Weighted average price
  previousClose: string; // "0.0009",       Previous day's close price
  currentClose: string; // "0.0025",       Current day's close price
  closeQuantity: string; // "10",           Close trade's quantity
  bestBid: string; // "0.0024",       Best bid price
  bestBidQuantity: string; // "10",           Bid bid quantity
  bestAskPrice: string; // "0.0026",       Best ask price
  bestAskQuantity: string; // "100",          Best ask quantity
  open: string; // "0.0010",       Open price
  high: string; // "0.0025",       High price
  low: string; // "0.0010",       Low price
  baseAssetVolume: string; // "10000",        Total traded base asset volume
  quoteAssetVolume: string; // "18",           Total traded quote asset volume
  openTime: number; // 0,              Statistics open time
  closeTime: number; // 86400000,       Statistics close time
  firstTradeId: number; // 0,              First trade ID
  lastTradeId: number; // 18150,          Last trade Id
  trades: number; // 18151           Total number of trades
}
