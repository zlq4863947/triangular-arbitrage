import { logger, Helper } from './common';
import { Event } from './event';
import { Engine } from './engine';
import * as types from './type';

const config = require('config');

export class TriangularArbitrage extends Event {
  exchanges: Map<string, types.IExchange> = new Map();
  options: types.IArbitrageOptions;
  activeExchange: types.ExchangeId;
  // 是否需要显示套利数据
  isDisplay = true;
  // 机器人id
  worker = 0;
  // 匹配引擎
  engine: Engine;

  constructor() {
    super();
    this.options = config;
    this.activeExchange = <types.ExchangeId>this.options.exchange.active;
    this.engine = new Engine({
      limit: this.options.display.maxRows,
    });
  }

  async start(activeExchange?: types.ExchangeId) {
    const timer = Helper.getTimer();
    logger.debug('启动三角套利机器人[开始]');
    if (activeExchange) {
      this.activeExchange = activeExchange;
    }

    try {
      // 初始化交易所
      await this.initExchange(this.activeExchange);
      if (types.ExchangeId.Binance === this.activeExchange) {
        const exchange = this.exchanges.get(this.activeExchange);
        if (!exchange) {
          return;
        }
        exchange.endpoint.ws.onAllTickerStream(this.estimate.bind(this));
      } else {
        this.worker = setInterval(this.estimate.bind(this), this.options.arbitrage.interval * 1000);
      }

      logger.info('----- 机器人启动完成 -----');
    } catch (err) {
      logger.error(`机器人运行出错(${Helper.endTimer(timer)}): ${err}`);
    }
    logger.debug(`启动三角套利机器人[终了] ${Helper.endTimer(timer)}`);
  }

  destroy() {
    clearInterval(this.worker);
  }

  private async initExchange(exchangeId: types.ExchangeId) {
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
        exchange.pairs = await api.loadMarkets();
        if (!exchange.pairs) {
          return;
        }
        const markets: {
          [coin: string]: types.IMarket[];
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
      logger.debug(`初始化交易所[终了] ${Helper.endTimer(timer)}`);
    } catch (err) {
      logger.error(`初始化交易所[异常](${Helper.endTimer(timer)}): ${err}`);
    }
  }

  // 测算
  async estimate(tickers?: types.Binance24HrTicker[]) {
    const timer = Helper.getTimer();
    logger.debug('监视行情[开始]');
    try {
      const exchange = this.exchanges.get(this.activeExchange);
      if (!exchange) {
        return;
      }
      const api = exchange.endpoint.public || exchange.endpoint.private;
      if (!api) {
        return;
      }
      let allTickers: types.ITickers;
      if (tickers && exchange.pairs) {
        allTickers = Helper.changeBinanceTickers(tickers, exchange.pairs);
      } else {
        allTickers = await api.fetchTickers();
      }
      // 匹配候选者
      const candidates = await this.engine.getCandidates(exchange, allTickers, this.options);
      if (!candidates || candidates.length === 0) {
        return;
      }

      if (this.isDisplay) {
        // 更新套利数据
        this.emit('updateArbitage', candidates);
      }
      // 更新套利数据
      const champion = candidates[0];
      if (champion.profitRate > this.options.arbitrage.minRateProfit) {
        logger.info(`选出套利组成冠军：${JSON.stringify(champion, null, 2)}`);
        // 执行三角套利
        this.emit('placeOrder', exchange, champion);
      }
      logger.debug(`监视行情[终了] ${Helper.endTimer(timer)}`);
    } catch (err) {
      logger.error(`监视行情[异常](${Helper.endTimer(timer)}): ${err}`);
    }
  }
}
