import * as types from '../type';

const ccxt = require('ccxt');
const config = require('config');
const excTime = require('execution-time');
const binance = require('binance');

export class Helper {
  static getPrivateKey(exchangeId: types.ExchangeId) {
    if (config.account[exchangeId] && config.account[exchangeId].apiKey && config.account[exchangeId].secret) {
      return <types.ICredentials>{
        apiKey: config.account[exchangeId].apiKey,
        secret: config.account[exchangeId].secret,
      };
    }
  }

  static getExchange(exchange: types.ExchangeId): types.IExchange | undefined {
    const privateKey = Helper.getPrivateKey(exchange);
    switch (exchange) {
      case types.ExchangeId.KuCoin:
      case types.ExchangeId.Binance:
        let ws;
        if (exchange === types.ExchangeId.Binance) {
          ws = new binance.BinanceWS();
        }
        if (privateKey) {
          return {
            id: exchange,
            endpoint: {
              private: new ccxt[exchange](privateKey),
              ws,
            },
          };
        }
        return {
          id: exchange,
          endpoint: {
            public: new ccxt[exchange](privateKey),
            ws,
          },
        };
      case types.ExchangeId.Bitbank:
      // todo
    }
  }

  static changeBinanceTickers(tickers: types.Binance24HrTicker[], pairs: types.IPairs) {
    const allTickers: types.ITickers = {};
    const pairKeys = Object.keys(pairs);
    for (const pair of pairKeys) {
      const oTicker = tickers.find(ticker => ticker.s === pair.replace('/', ''));
      if (oTicker) {
        allTickers[pair] = {
          ask: +oTicker.a,
          askVolume: +oTicker.A,
          bid: +oTicker.b,
          bidVolume: +oTicker.B,
          symbol: pair,
          timestamp: oTicker.E,
          datetime: '',
          high: 0,
          low: 0,
          info: {},
        }
      }
    }
    return allTickers;
  }

  static getTimer() {
    const timer = excTime();
    timer.start();
    return timer;
  }
  static endTimer(timer: any) {
    return timer.stop().words;
  }
}
