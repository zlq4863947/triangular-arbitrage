import { logger, Helper } from './common';
import { Bot } from './bot';
import { UI } from './ui';
import { Event } from './event';
// import { CurrencyCore } from './currency-core';
import * as assert from 'power-assert';
import { EventEmitter } from 'events';
import * as types from './type';
import { Market } from 'ccxt';

const config = require('config');

export class TriangularArbitrage extends Event {
  exchanges: Map<string, types.IExchange> = new Map();
  options: types.IArbitrageOptions;
  activeExchange: types.ExchangeId;

  constructor() {
    super();
    this.options = config;
    this.activeExchange = <types.ExchangeId>this.options.exchange.active;
  }

  async start(activeExchange?: types.ExchangeId) {
    logger.info('启动三角套利机器人...');
    if (activeExchange) {
      this.activeExchange = activeExchange;
    }

    try {
      // 初始化交易所
      this.initExchange(this.activeExchange);
      // 初始化市场
      this.initMarket();

      logger.info('----- 机器人启动完成 -----');
    } catch (err) {
      logger.error('机器人运行出错: ' + err);
    }
  }

  initExchange(activeExchange: types.ExchangeId) {
    // 查看是否已初始化api
    if (this.exchanges.get(activeExchange)) {
      return;
    }

    const api = Helper.getExchange(activeExchange);
    if (api) {
      this.exchanges.set(activeExchange, api);
    }
  }

  initMarket() {
    if (this.exchanges.size === 0) {
      return;
    }
    this.exchanges.forEach(async (exchange: types.IExchange) => {
      if (exchange && exchange.endpoint.public) {
        const api = exchange.endpoint.public;
        exchange.pairs = await api.loadMarkets();
        if (!exchange.pairs) {
          return;
        }
        if (exchange.id === types.ExchangeId.Binance) {
          const baseCoins = [this.options.arbitrage.start].concat(this.options.arbitrage.baseCoins);
          for (const baseCoin of baseCoins) {
            let pairKeys = Object.keys(exchange.pairs);
            pairKeys = pairKeys.filter((pair: string) => pair.includes(baseCoin));
            exchange.markets = {};
            for (const key of pairKeys) {
              exchange.markets[baseCoin].push(exchange.pairs[key]);
            }
          }
        }
      }
    });
  }
}
