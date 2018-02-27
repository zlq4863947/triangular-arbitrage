import { logger, Helper } from './common';
import { Bot } from './bot';
import { UI } from './ui';
import { Event } from './event';
import { CurrencyCore } from './currency-core';
import * as assert from 'power-assert';
import { EventEmitter } from 'events';
import * as types from './type';

const config = require('config');

export class TriangularArbitrage {
  exchanges: Map<string, types.IExchangeApi> = new Map();
  options: types.IArbitrageOptions;

  constructor() {
    this.options = config;
  }

  async start(activeExchange: types.ExchangeId) {
    logger.info('启动三角套利机器人...');

    try {
      // 查看是否初始化api
      if (!this.exchanges.get(activeExchange)) {
        const api = Helper.getExchangeApi(activeExchange);
        if (api) {
          this.exchanges.set(activeExchange, api);
        }
      }

      logger.info('----- 机器人启动完成 -----');
    } catch (err) {
      logger.error('机器人运行出错: ' + err);
    }
  }
}
