import * as types from './type';
import { logger, Helper } from './common';
import { Bitbank } from 'bitbank-handler';

export class Aggregator {
  async getMarkets(exchange: types.IExchange): Promise<types.IPairs | undefined> {
    const api = exchange.endpoint.public || exchange.endpoint.private;
    if (!api) {
      return;
    }
    switch (exchange.id) {
      case types.ExchangeId.Bitbank:
        return <any>{
          'BCC/BTC': { id: 'bcc_btc', symbol: 'BCC/BTC', base: 'BCC', quote: 'BTC', baseId: 'BCC' },
          'BCC/JPY': { id: 'bcc_jpy', symbol: 'BCC/JPY', base: 'BCC', quote: 'JPY', baseId: 'BCC' },
          'MONA/BTC': { id: 'mona_btc', symbol: 'MONA/BTC', base: 'MONA', quote: 'BTC' },
          'MONA/JPY': { id: 'mona_jpy', symbol: 'MONA/JPY', base: 'MONA', quote: 'JPY' },
          'ETH/BTC': { id: 'eth_btc', symbol: 'ETH/BTC', base: 'ETH', quote: 'BTC' },
          'LTC/BTC': { id: 'ltc_btc', symbol: 'LTC/BTC', base: 'LTC', quote: 'BTC' },
          'XRP/JPY': { id: 'xrp_jpy', symbol: 'XRP/JPY', base: 'XRP', quote: 'JPY' },
          'BTC/JPY': { id: 'btc_jpy', symbol: 'BTC/JPY', base: 'BTC', quote: 'JPY' },
        };
      default:
        return await api.loadMarkets();
    }
  }

  async getAllTickers(exchange: types.IExchange, extTickers?: types.Binance24HrTicker[]): Promise<types.ITickers | undefined> {
    try {
      const api = exchange.endpoint.public || exchange.endpoint.private;
      if (!api || !exchange.pairs) {
        return;
      }
      switch (exchange.id) {
        case types.ExchangeId.Binance:
          if (!extTickers) {
            logger.error(`getAllTickers:[${exchange.id}], 未传递extTickers数据！`);
            return;
          }
          return Helper.changeBinanceTickers(extTickers, exchange.pairs);
        case types.ExchangeId.Bitbank:
          const symbols = Object.keys(exchange.pairs);
          const bitbank = <Bitbank>api;
          const tickers: types.ITickers = {};
          for (const symbol of symbols) {
            const tickId = symbol.replace('/', '_').toLowerCase();
            const extDepth = await bitbank.getDepth(tickId).toPromise();
            tickers[symbol] = {
              ask: +extDepth.asks[0][0],
              askVolume: +extDepth.asks[0][1],
              bid: +extDepth.bids[0][0],
              bidVolume: +extDepth.bids[0][1],
              symbol,
              timestamp: Date.now(),
              datetime: '',
              high: 0,
              low: 0,
              info: {},
            };
          }
          return tickers;
        default:
          return await api.fetchTickers();
      }
    } catch (err) {
      logger.error(`getAllTickers出错： ${err.message ? err.message : err.msg}`);
    }
  }
}
