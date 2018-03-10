import { logger, Helper } from './common';
import { Event } from './event';
import { Engine } from './engine';
import { Aggregator } from './aggregator';
import { BigNumber } from 'bignumber.js';
import * as types from './type';

const clc = require('cli-color');
const config = require('config');

export class TriangularArbitrage extends Event {
  exchanges: Map<string, types.IExchange> = new Map();
  activeExchangeId: types.ExchangeId;
  // 机器人id
  worker = 0;
  // 匹配引擎
  engine: Engine;
  // 集计数据提供
  aggregator: Aggregator;

  constructor() {
    super();
    this.activeExchangeId = <types.ExchangeId>config.exchange.active;
    this.engine = new Engine();
    this.aggregator = new Aggregator();
  }

  async start(activeExchangeId?: types.ExchangeId) {
    const timer = Helper.getTimer();
    logger.debug('启动三角套利机器人[开始]');
    if (activeExchangeId) {
      this.activeExchangeId = activeExchangeId;
    }

    try {
      // 初始化交易所
      await this.initExchange(this.activeExchangeId);
      if (types.ExchangeId.Binance === this.activeExchangeId) {
        const exchange = this.exchanges.get(this.activeExchangeId);
        if (!exchange) {
          return;
        }
        exchange.endpoint.ws.onAllTickers(this.estimate.bind(this));
      } else {
        this.worker = setInterval(this.estimate.bind(this), config.arbitrage.interval * 1000);
      }

      logger.info('----- 机器人启动完成 -----');
    } catch (err) {
      logger.error(`机器人运行出错(${Helper.endTimer(timer)}): ${err}`);
    }
    logger.debug(`启动三角套利机器人[终了] ${Helper.endTimer(timer)}`);
  }

  destroy() {
    if (this.worker) {
      clearInterval(this.worker);
    }
  }

  public async initExchange(exchangeId: types.ExchangeId) {
    const timer = Helper.getTimer();
    logger.debug('初始化交易所[启动]');
    try {
      // 查看是否已初始化api
      if (this.exchanges.get(exchangeId)) {
        return;
      }

      const exchange = Helper.getExchange(exchangeId);
      if (!exchange) {
        return;
      }
      const api = exchange.endpoint.public || exchange.endpoint.private;
      if (api) {
        exchange.pairs = await this.aggregator.getMarkets(exchange);
        if (!exchange.pairs) {
          return;
        }
        const markets: {
          [coin: string]: types.IMarket[];
        } = {};
        const baseCoins = Helper.getMarketCoins(Object.keys(exchange.pairs));
        for (const baseCoin of baseCoins) {
          if (!markets[baseCoin]) {
            markets[baseCoin] = [];
          }
          const pairKeys = Object.keys(exchange.pairs).filter((pair: string) => pair.includes(baseCoin));
          for (const key of pairKeys) {
            markets[baseCoin].push(exchange.pairs[key]);
          }
          exchange.markets = markets;
        }
      }
      this.exchanges.set(exchangeId, exchange);
      logger.debug(`初始化交易所[终了] ${Helper.endTimer(timer)}`);
    } catch (err) {
      logger.error(`初始化交易所[异常](${Helper.endTimer(timer)}): ${err}`);
    }
  }

  // 套利测算
  async estimate(tickers?: types.Binance24HrTicker[]) {
    const timer = Helper.getTimer();
    logger.info('----- 套利测算 -----');
    logger.debug('监视行情[开始]');
    try {
      const exchange = this.exchanges.get(this.activeExchangeId);
      if (!exchange) {
        return;
      }
      const allTickers = await this.aggregator.getAllTickers(exchange, tickers);
      if (!allTickers) {
        return;
      }
      // 匹配候选者
      const candidates = await this.engine.getCandidates(exchange, allTickers);
      if (!candidates || candidates.length === 0) {
        return;
      }

      const ranks = Helper.getRanks(exchange.id, candidates);
      if (config.storage.tickRank && ranks.length > 0) {
        // 更新套利数据
        this.emit('updateArbitage', ranks);
      }
      // 更新套利数据
      if (ranks[0]) {
        logger.info(`选出套利组合第一名：${candidates[0].id}, 预测利率(扣除手续费): ${ranks[0].profitRate[0]}`);
        // 执行三角套利
        this.emit('placeOrder', exchange, candidates[0]);
      }

      const output = candidates.length > 5 ? candidates.slice(0, 5) : candidates.slice(0, candidates.length);
      for (const candidate of output) {
        const clcRate = candidate.rate < 0 ? clc.redBright(candidate.rate) : clc.greenBright(candidate.rate);
        const path = candidate.id.length < 15 ? candidate.id + ' '.repeat(15 - candidate.id.length) : candidate.id;
        logger.info(`路径：${clc.cyanBright(path)} 利率: ${clcRate}`);
      }
      logger.debug(`监视行情[终了] ${Helper.endTimer(timer)}`);
    } catch (err) {
      logger.error(`监视行情[异常](${Helper.endTimer(timer)}): ${err}`);
    }
  }
}
