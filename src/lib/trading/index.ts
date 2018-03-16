import { BigNumber } from 'bignumber.js';
import * as ccxt from 'ccxt';
import { logger, Helper } from '../common';
import { ApiHandler } from '../api-handler';
import { Storage } from '../storage';
import { Mocker } from './mocker';
import * as types from '../type';

const clc = require('cli-color');
const config = require('config');

export class Trading extends ApiHandler {
  mocker: Mocker;
  storage: Storage;
  private worker = 0;

  constructor() {
    super();
    this.mocker = new Mocker();
    this.storage = new Storage();
  }
  async testOrder(exchange: types.IExchange, triangle: types.ITriangle) {
    return await this.mocker.testOrder(exchange, triangle);
  }
  // 下单
  async placeOrder(exchange: types.IExchange, triangle: types.ITriangle) {
    try {
      const testTrade = await this.testOrder(exchange, triangle);
      // 未通过检查时返回
      if (!testTrade) {
        logger.info(`套利组合未通过可行性检测！！`);
        return;
      }

      if (config.trading.mock) {
        logger.info('配置为模拟交易，终止真实交易！');
        return;
      }

      logger.info('----- 套利开始 -----');
      logger.info(`路径：${clc.cyanBright(triangle.id)} 利率: ${triangle.rate}`);
      const limitCheck = await Helper.checkQueueLimit(this.storage.queue)
      if (!limitCheck) {
        logger.debug('交易会话数已到限制数!!');
        return;
      }

      const timer = Helper.getTimer();
      // 获取交易额度
      logger.info(`第一步：${clc.blueBright(triangle.a.pair)}`);
      testTrade.a.timecost = '';
      // 放入交易队列
      await this.storage.openTradingSession({
        mock: testTrade,
        real: testTrade
      });
      logger.info(`限价：${testTrade.a.price}, 数量：${testTrade.a.amount}, 方向：${testTrade.a.side}`);
      const order = <types.IOrder>{
        symbol: testTrade.a.pair,
        side: testTrade.a.side.toLowerCase(),
        type: 'limit',
        price: testTrade.a.price,
        amount: testTrade.a.amount,
      };
      const orderInfo = await this.createOrder(exchange, order);
      if (!orderInfo) {
        return;
      }
      logger.debug(`下单返回值: ${JSON.stringify(orderInfo, null, 2)}`);

      testTrade.a.status = orderInfo.status;
      testTrade.a.orderId = orderInfo.id;

      // 更新队列
      await this.storage.updateTradingSession(testTrade, 0);
      const nextB = async () => {
        logger.info('执行nextB...');
        const orderRes = await this.queryOrder(exchange, orderInfo.id, orderInfo.symbol);
        if (!orderRes) {
          return false;
        }
        logger.info(`查询订单状态： ${orderRes.status}`);
        // 交易成功时
        if (orderRes.status === 'closed') {
          testTrade.a.timecost = Helper.endTimer(timer);
          // 修正数量
          testTrade.a.amount = orderRes.amount;
          testTrade.a.status = orderRes.status;
          // 更新队列
          await this.storage.updateTradingSession(testTrade, 0);

          if (this.worker) {
            clearInterval(this.worker);
          }
          await this.orderB(exchange, testTrade);
          return true;
        }
        return false;
      };

      // 订单未成交时
      if (!await nextB()) {
        logger.info('订单未成交,每秒循环执行。');
        this.worker = setInterval(nextB.bind(this), 1000);
      }
    } catch (err) {
      logger.error(`订单出错： ${err.message ? err.message : err.msg}`);
      await this.errorHandle(triangle.id, exchange.id)
    }
  }

  async orderB(exchange: types.IExchange, trade: types.ITradeTriangle) {
    logger.info(`第二步：${clc.blueBright(trade.b.pair)}`);
    try {
      const timer = Helper.getTimer();
      const tradeB = trade.b;

      logger.info(`限价：${tradeB.price}, 数量：${tradeB.amount}, 方向：${tradeB.side}`);
      const order = <types.IOrder>{
        symbol: tradeB.pair,
        side: tradeB.side.toLowerCase(),
        type: 'limit',
        price: tradeB.price,
        amount: tradeB.amount,
      };
      const orderInfo = await this.createOrder(exchange, order);
      if (!orderInfo) {
        return;
      }
      logger.debug(`下单返回值: ${JSON.stringify(orderInfo, null, 2)}`);

      trade.b.status = <any>orderInfo.status;
      trade.b.orderId = orderInfo.id;
      // 更新队列
      await this.storage.updateTradingSession(trade, 1);
      const nextC = async () => {
        logger.info('执行nextC...');

        const orderRes = await this.queryOrder(exchange, orderInfo.id, orderInfo.symbol);
        if (!orderRes) {
          return false;
        }
        logger.info(`查询订单状态： ${orderRes.status}`);
        // 交易成功时
        if (orderRes.status === 'closed') {
          if (this.worker) {
            clearInterval(this.worker);
          }
          trade.b.timecost = Helper.endTimer(timer);
          // 修正数量
          trade.b.amount = orderRes.amount;
          trade.b.status = orderRes.status;
          // 更新队列
          await this.storage.updateTradingSession(trade, 1);
          await this.orderC(exchange, trade);
          return true;
        }
        return false;
      };

      // 订单未成交时
      if (!await nextC()) {
        logger.info('订单未成交,每秒循环执行。');
        this.worker = setInterval(nextC.bind(this), 1000);
      }
    } catch (err) {
      logger.error(`订单出错： ${err.message ? err.message : err.msg}`);
      await this.errorHandle(trade.id, exchange.id)
    }
  }

  async orderC(exchange: types.IExchange, trade: types.ITradeTriangle) {
    logger.info(`第三步：${clc.blueBright(trade.c.pair)}`);
    try {
      const timer = Helper.getTimer();
      const tradeC = trade.c;
      logger.info(`限价：${tradeC.price}, 数量：${tradeC.amount}, 方向：${tradeC.side}`);
      const order = <types.IOrder>{
        symbol: tradeC.pair,
        side: tradeC.side.toLowerCase(),
        type: 'limit',
        price: tradeC.price,
        amount: tradeC.amount,
      };
      const orderInfo = await this.createOrder(exchange, order);
      if (!orderInfo) {
        return;
      }
      logger.debug(`下单返回值: ${JSON.stringify(orderInfo, null, 2)}`);

      trade.c.status = orderInfo.status;
      trade.c.orderId = orderInfo.id;
      // 更新队列
      await this.storage.updateTradingSession(trade, 2);
      const completedC = async () => {
        logger.info('completedC...');
        const orderRes = await this.queryOrder(exchange, orderInfo.id, orderInfo.symbol);
        if (!orderRes) {
          return false;
        }
        logger.info(`查询订单状态： ${orderRes.status}`);
        // 交易成功时
        if (orderRes.status === 'closed') {
          if (this.worker) {
            clearInterval(this.worker);
          }
          logger.info(`三角套利完成,最终获得：${orderRes.amount}...`);
          trade.c.timecost = Helper.endTimer(timer);
          // 修正数量
          trade.c.amount = orderRes.amount;
          trade.c.status = orderRes.status;
          // 在交易队列中清除这条数据
          await this.storage.closeTradingSession(trade);
        }
        return false;
      };

      // 订单未成交时
      if (!await completedC()) {
        logger.info('订单未成交,每秒循环执行。');
        this.worker = setInterval(completedC.bind(this), 1000);
      }
    } catch (err) {
      logger.error(`订单出错： ${err.message ? err.message : err.msg}`);
      await this.errorHandle(trade.id, exchange.id)
    }
  }

  private async errorHandle(triangleId: string, exchangeId: string) {
    // 退出交易队列
    await this.storage.clearQueue(triangleId, exchangeId);
  }
}
