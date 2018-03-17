import * as types from '../type';
import { ApiHandler } from '../api-handler';
import { logger, Helper } from '../common';
import { Storage } from '../storage';
import { Daemon } from './daemon';

const clc = require('cli-color');
export class Order extends ApiHandler {

  private worker = 0;
  storage: Storage;
  daemon: Daemon;

  constructor(storage: Storage) {
    super();
    this.storage = storage;
    this.daemon = new Daemon(this.storage);
  }

  async orderA(exchange: types.IExchange, testTrade: types.ITradeTriangle) {
    try {
      const timer = Helper.getTimer();
      // 获取交易额度
      logger.info(`第一步：${clc.blueBright(testTrade.a.pair)}`);
      testTrade.a.timecost = '';
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
      await this.daemon.reboot(exchange, testTrade)
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
      await this.daemon.reboot(exchange, trade);
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
      await this.daemon.reboot(exchange, trade);
    }
  }
}
