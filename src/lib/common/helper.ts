import * as types from '../type';
import { Rate } from '../rate';
import { Queue } from '../storage/queue';
import { BigNumber } from 'bignumber.js';
import * as bitbank from 'bitbank-handler';

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

  static getExchange(exchangeId: types.ExchangeId): types.IExchange | undefined {
    const privateKey = Helper.getPrivateKey(exchangeId);
    switch (exchangeId) {
      case types.ExchangeId.KuCoin:
      case types.ExchangeId.Binance:
        let ws, rest;
        if (exchangeId === types.ExchangeId.Binance) {
          ws = new binance.BinanceWS();
          rest = new binance.BinanceRest({
            key: privateKey ? privateKey.apiKey : '',
            secret: privateKey ? privateKey.secret : '',
            timeout: 15000,
            recvWindow: 10000,
            disableBeautification: false,
            handleDrift: false,
          });
        }
        if (privateKey) {
          return {
            id: exchangeId,
            endpoint: {
              private: new ccxt[exchangeId](privateKey),
              ws,
              rest,
            },
          };
        }
        return {
          id: exchangeId,
          endpoint: {
            public: new ccxt[exchangeId](),
            ws,
            rest,
          },
        };
      case types.ExchangeId.Bitbank:
        if (privateKey) {
          return {
            id: exchangeId,
            endpoint: {
              private: new bitbank.Bitbank({
                apiKey: privateKey.apiKey,
                apiSecret: privateKey.secret,
              }),
            },
          };
        }
        return {
          id: exchangeId,
          endpoint: {
            public: new bitbank.Bitbank({}),
          },
        };
    }
  }

  static getMarketCoins(pairs: string[]) {
    const markets: string[] = [];
    pairs.reduce(
      (pre, pair) => {
        const market = pair.substr(pair.indexOf('/') + 1);
        if (market && !markets.includes(market)) {
          markets.push(market);
        }
      },
      <any>{},
    );
    return markets;
  }

  static changeBinanceTickers(tickers: types.Binance24HrTicker[], pairs: types.IPairs) {
    const allTickers: types.ITickers = {};
    const pairKeys = Object.keys(pairs);
    for (const pair of pairKeys) {
      const oTicker = tickers.find((ticker) => ticker.symbol === pair.replace('/', ''));
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
        };
      }
    }
    return allTickers;
  }

  /**
   * 获取排行数据
   * @param triangles 三角套利数组
   */
  static getRanks(exchangeId: types.ExchangeId, triangles: types.ITriangle[]) {
    const ranks: types.IRank[] = [];
    triangles.reduce(
      (pre, tri) => {
        if (tri.rate <= 0) {
          return;
        }
        const rate = new BigNumber(tri.rate);
        let fee = [0, 0];
        if (exchangeId === types.ExchangeId.Binance) {
          fee = [rate.times(0.1).toNumber(), rate.times(0.05).toNumber()];
        }
        const profitRate = [rate.minus(fee[0]), rate.minus(fee[1])];
        if (profitRate[0].isLessThan(config.arbitrage.minRateProfit)) {
          return;
        }
        const rank: types.IRank = {
          stepA: tri.a.coinFrom,
          stepB: tri.b.coinFrom,
          stepC: tri.c.coinFrom,
          rate: rate.toNumber(),
          fee: [fee[0], fee[1]],
          profitRate: [profitRate[0].toNumber(), profitRate[1].toNumber()],
          ts: tri.ts,
        };
        ranks.push(rank);
      },
      <any>{},
    );
    return ranks;
  }

  static toFixed(val: BigNumber, precision: number = 8) {
    return val.toFixed(precision);
  }

  static getTriangleRate(a: types.IEdge, b: types.IEdge, c: types.IEdge) {
    // 利率 = (1/priceA/priceB*priceC-1)-1
    // 资本金
    const capital = new BigNumber(1);
    let step1Rate = new BigNumber(a.price);
    if (a.side === 'buy') {
      step1Rate = capital.div(a.price);
    }

    let step2Rate = step1Rate.times(b.price);
    if (b.side === 'buy') {
      step2Rate = step1Rate.div(b.price);
    }

    let step3Rate = step2Rate.times(c.price);
    if (c.side === 'buy') {
      step3Rate = step2Rate.div(c.price);
    }

    return +step3Rate
      .minus(1)
      .times(100)
      .toFixed(8);
  }

  static getTimer() {
    const timer = excTime();
    timer.start();
    return timer;
  }

  static endTimer(timer: any) {
    return timer.stop().words;
  }

  /**
   * 获取价格精度
   */
  static getPriceScale(pairs: types.IPairs, pairName: string): types.IPrecision | undefined {
    const symbol = pairs[pairName];
    if (!symbol) {
      return;
    }
    return {
      amount: symbol.precision.amount,
      price: symbol.precision.price,
      cost: symbol.limits.cost ? symbol.limits.cost.min : undefined,
    };
  }

  /**
   * 获取基础货币交易额度
   */
  static getBaseTradeAmount(tradeAmount: BigNumber, freeAmount: BigNumber) {
    // 如果A点交易额 x 50% < 该资产可用额度
    if (tradeAmount.times(0.5).isLessThan(freeAmount)) {
      // 返回交易额 x 50%
      return tradeAmount.times(0.5);
    }
    // 返回可用额度 x 50%
    return freeAmount.times(0.5);
  }

  /**
   * 获取基础货币交易额度
   */
  static getBaseAmountByBC(triangle: types.ITriangle, freeAmount: BigNumber, minAmount: BigNumber) {
    const { a, b, c } = triangle;
    // B点的数量
    const bAmount = Helper.convertAmount(b.price, b.quantity, b.side);

    // 换回A点的数量
    const b2aAmount = Helper.convertAmount(a.price, bAmount.toNumber(), a.side);
    // c点数量
    const c2aAmount = Helper.getConvertedAmount({
      side: triangle.c.side,
      exchangeRate: triangle.c.price,
      amount: triangle.c.quantity,
    })

    // 选取数量最大的
    const thanAmount = b2aAmount.isGreaterThan(c2aAmount) ? b2aAmount : c2aAmount;
    // 选取数量 > 最小交易量 && 选取数量 < 可用余额
    if (thanAmount.isGreaterThan(minAmount) && thanAmount.isLessThan(freeAmount)) {
      return thanAmount;
    }
    return minAmount;
  }

  /**
   * 获取转换后的数量
   */
  static getConvertedAmount(rateQuote: types.IRateQuote) {
    return Rate.convert(rateQuote);
  }

  /**
   * 转换获取指定总价（标的货币数量）时，需要的交易数量
   * @param price 价格
   * @param cost 总价
   * @param side 方向
   */
  static convertAmount(price: number, cost: number, side: 'sell' | 'buy') {
    return Rate.convertAmount(price, cost, side);
  }

  /**
   * 检查交易队列是否超过限制
   */
  static async checkQueueLimit(queue: Queue) {
    const res = await queue.info();
    if (res && res.doc_count < config.trading.limit) {
      return true;
    }
    return false;
  }
}
