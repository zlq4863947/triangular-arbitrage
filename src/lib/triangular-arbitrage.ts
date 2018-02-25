import { logger } from './logger';
import { Database } from './database';
import { Bot } from './bot';
import { UI } from './ui';
import { Event } from './event';
import { CurrencyCore } from './currency-core';
import * as assert from 'power-assert';
import { EventEmitter } from 'events';
import { IBotOptions, ICtrl, IStreams } from './type';

const config = require('config');

export class TriangularArbitrage {
  socket: EventEmitter;

  constructor(options: any) {
    this.socket = options.socket;
  }

  async start() {
    assert(config.binance, 'config.binance required.');
    assert(config.binance.apiKey, 'config.binance.apiKey required.');
    assert(config.binance.secret, 'config.binance.secret required.');

    logger.info('\n\n\n----- 启动机器人 : -----\n\n\n');

    let exchangeAPI: { [attr: string]: any } = {};

    logger.info('--- 加载交易所API');

    // 使交易所模块动态更新
    if (config.activeExchange == 'binance') {
      logger.info('--- \t激活的交易所:' + config.activeExchange);
      // activePairs = config.binancePairs;

      const api = require('binance');
      exchangeAPI = new api.BinanceRest({
        key: config.binance.apiKey,
        secret: config.binance.secret,
        timeout: parseInt(config.restTimeout), // 可选，默认为15000，请求超时为毫秒
        recvWindow: parseInt(config.restRecvWindow), // 可选，默认为5000，如果您收到时间戳错误，则增加
        disableBeautification: !config.restBeautify,
      });
      exchangeAPI.WS = new api.BinanceWS();
    }

    const botOptions: IBotOptions = {
      socket: this.socket,
      UI: {
        title: '最有潜力的三角套利，通过: ' + config.binanceColumns,
      },
      arbitrage: {
        paths: config.binanceColumns.split(','),
        start: config.binanceStartingPoint,
      },
      storage: {
        logHistory: false,
      },
      trading: {
        paperOnly: true,
        // 只有超过 x% 增益潜力的候选人排队等待交易
        minQueuePercentageThreshold: 3,
        // 在决定采取行动之前，我们需要多少次看到相同的机会
        minHitsThreshold: 5,
      },
    };

    const ctrl: ICtrl = {
      options: botOptions,
      storage: {
        db: <any>{},
        trading: {
          // 三角组合队列
          queue: [],
          // 活跃的可交易三角组合
          active: [],
        },
        candidates: [],
        streams: <IStreams>{},
        pairRanks: [],
        streamTick: <any>{}
      },
      logger: logger,
      exchange: exchangeAPI,
      UI: <UI>{},
      events: <Event>{},
      currencyCore: <CurrencyCore>{}
    };

    // 加载数据库，然后启动DB并连接后启动数据流
    try {
      /*const database = new Database();
      const mongo = await database.startup(logger);

      if (config.useMongo) {
        ctrl.storage.db = mongo;
        ctrl.options.storage.logHistory = true;
      }*/
      ctrl.UI = new UI(ctrl.options);
      ctrl.events = new Event(ctrl);

      // 我们已经准备好开始了。加载webhook流, 开始下红包雨。
      const bot = new Bot(ctrl);
      await bot.start();

      ctrl.logger.info('----- 机器人启动完成 -----');
    } catch (err) {
      ctrl.logger.error('MongoDB连接不可用，禁用历史记录: ' + err);
      ctrl.options.storage.logHistory = false;
    }
  }
}
