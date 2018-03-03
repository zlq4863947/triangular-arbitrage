import * as types from '../type';
import { BigNumber } from 'BigNumber.js';

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
        let ws, rest;
        if (exchange === types.ExchangeId.Binance) {
          ws = new binance.BinanceWS();
          rest = new binance.BinanceRest({
            key: privateKey ? privateKey.apiKey : '',
            secret: privateKey ? privateKey.secret : '',
            timeout: 15000,
            recvWindow: 10000,
            disableBeautification: false,
            handleDrift: false
          });
        }
        if (privateKey) {
          return {
            id: exchange,
            endpoint: {
              private: new ccxt[exchange](privateKey),
              ws,
              rest,
            },
          };
        }
        return {
          id: exchange,
          endpoint: {
            public: new ccxt[exchange](privateKey),
            ws,
            rest,
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
      const oTicker = tickers.find(ticker => ticker.symbol === pair.replace('/', ''));
      if (oTicker) {
        allTickers[pair] = {
          ask: +oTicker.bestAskPrice,
          askVolume: +oTicker.bestAskQuantity,
          bid: +oTicker.bestBid,
          bidVolume: +oTicker.bestBidQuantity,
          symbol: pair,
          timestamp: oTicker.eventTime,
          datetime: '',
          high: +oTicker.high,
          low: +oTicker.low,
          info: {},
        }
      }
    }
    return allTickers;
  }

  /**
   * 获取排行数据
   * @param triangles 三角套利数组
   */
  static getRanks(triangles: types.ITriangle[]) {
    const ranks: types.IRank[] = [];
    triangles.reduce((pre, tri) => {
      const rate = new BigNumber(tri.rate);
      const fee = [
        rate.times(0.1),
        rate.times(0.05)
      ]
      const profitRate = [
        rate.minus(fee[0]),
        rate.minus(fee[1])
      ]
      const rank: types.IRank = {
        stepA: tri.a.coinFrom,
        stepB: tri.b.coinFrom,
        stepC: tri.c.coinFrom,
        rate: rate.toFixed(3),
        fee: [
          fee[0].toFixed(3),
          fee[1].toFixed(3)
        ],
        profitRate: [
          profitRate[0].toFixed(3),
          profitRate[1].toFixed(3)
        ],
        ts: tri.ts
      };
      ranks.push(rank)
    }, <any>{});
    return ranks;
  }

  static toFixed(val: any, precision: number = 8) {
    return new BigNumber(String(val)).toFixed(precision);
  }

  static getTriangleRate(priceA: number, priceB: number, priceC: number) {
    // 利率 = (1/priceA/priceB*priceC-1)*100
    return new BigNumber(1).div(priceA).div(priceB).times(priceC)
      .minus(1).times(100).toFixed(3);
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
