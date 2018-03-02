import { logger, Helper } from './common';
import { UI } from './ui';
import { Event } from './event';
// import { CurrencyCore } from './currency-core';
import * as assert from 'power-assert';
import * as types from './type';
import { Market } from 'ccxt';
import { Engine } from './engine';

const config = require('config');

export class TriangularArbitrage extends Event {
  exchanges: Map<string, types.IExchange> = new Map();
  options: types.IArbitrageOptions;
  activeExchange: types.ExchangeId;
  // 机器人id
  worker = 0;
  // 匹配引擎
  engine: Engine;

  constructor() {
    super();
    this.options = config;
    this.activeExchange = <types.ExchangeId>this.options.exchange.active;
    this.engine = new Engine();
  }

  async start(activeExchange?: types.ExchangeId) {
    logger.info('启动三角套利机器人...');
    if (activeExchange) {
      this.activeExchange = activeExchange;
    }

    try {
      // 初始化交易所
      await this.initExchange(this.activeExchange);
      this.worker = setInterval(this.estimate.bind(this), this.options.arbitrage.interval);

      logger.info('----- 机器人启动完成 -----');
    } catch (err) {
      logger.error('机器人运行出错: ' + err);
    }
  }

  destroy() {
    clearInterval(this.worker);
  }

  private async initExchange(exchangeId: types.ExchangeId) {
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
      exchange.pairs = await api.loadMarkets();
      if (!exchange.pairs) {
        return;
      }
      const markets: {
        [coin: string]: Market[];
      } = {};
      if (exchange.id === types.ExchangeId.Binance) {
        const baseCoins = [this.options.arbitrage.start].concat(this.options.arbitrage.baseCoins);
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
    }
    this.exchanges.set(exchangeId, exchange);
  }

  // 测算
  async estimate() {
    const exchange = this.exchanges.get(this.activeExchange);
    if (!exchange) {
      return;
    }
    // 匹配候选者
    const candidates = await this.engine.getCandidates(exchange, this.options);
    if (!candidates) {
      return;
    }
    const champion = candidates[0];
    if (champion.profitRate > this.options.arbitrage.minRateProfit) {
      // 执行三角套利
      this.emit('placeOrder', champion);
    }
  }
}
