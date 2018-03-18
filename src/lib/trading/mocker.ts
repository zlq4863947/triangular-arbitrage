import { BigNumber } from 'bignumber.js';
import * as ccxt from 'ccxt';
import { logger, Helper } from '../common';
import { ApiHandler } from '../api-handler';
import * as types from '../type';

const clc = require('cli-color');
const config = require('config');

export class Mocker extends ApiHandler {
  constructor() {
    super();
  }

  /**
   * 模拟每个边的交易信息
   *
   * @param pairs 全市场交易对
   * @param edge 组合边
   * @param amount 待交易数量
   */
  getMockTradeEdge(pairs: types.IPairs, edge: types.IEdge, amount: BigNumber) {
    const tradeEdge = <types.ITradeEdge>{
      pair: edge.pair,
      side: edge.side,
    };
    const timer = Helper.getTimer();

    // 获取交易精度
    const priceScale = Helper.getPriceScale(pairs, edge.pair);
    if (!priceScale) {
      logger.debug(`未取得交易精度！！`);
      return;
    }
    // 获取格式化精度(买->价格精度、卖->数量精度)
    const precision = edge.side.toLowerCase() === 'buy' ? priceScale.price : priceScale.amount;
    // 格式化购买数量(多余小数位舍弃)
    const fmAmount = new BigNumber(amount.toFixed(precision, 1));
    if (fmAmount.isZero()) {
      logger.debug(`格式化购买数量后结果为0！！`);
      return;
    }
    // 查询交易对手续费
    const feeRate = pairs[edge.pair].maker;
    if (!feeRate || feeRate <= 0) {
      logger.debug(`未取得交易对的手续费！！`);
      return;
    }
    tradeEdge.amount = +amount.toFixed(priceScale.amount, 1);
    tradeEdge.price = edge.price;
    tradeEdge.fee = Helper.getConvertedAmount({
      side: edge.side,
      exchangeRate: edge.price,
      amount: tradeEdge.amount
    }).times(feeRate).toFixed(8) + ' ' + edge.coinTo;
    tradeEdge.timecost = Helper.endTimer(timer);
    return tradeEdge;
  }

  // 订单执行前，可行性检查
  async testOrder(exchange: types.IExchange, triangle: types.ITriangle) {
    logger.info(`三角套利组合：${triangle.id}, 订单可行性检测...`);
    if (!exchange.endpoint.private || !exchange.pairs) {
      logger.error('交易所相关参数出错！！');
      return;
    }

    // 查询资产
    const balances = await this.getBalance(exchange);
    if (!balances) {
      logger.debug('未查找到持有资产！！');
      return;
    }

    const tradeTriangle = <types.ITradeTriangle>{
      coin: triangle.a.coinFrom,
      exchange: config.exchange.active,
    };

    const asset = balances[tradeTriangle.coin];
    if (!asset) {
      logger.debug(`未查找到持有${tradeTriangle.coin}！！`);
      return;
    }
    const free = new BigNumber(asset.free);
    if (free.isZero()) {
      logger.debug(`未查找到持有${tradeTriangle.coin}！！`);
      return;
    }
    // 获取交易精度
    const priceScale = Helper.getPriceScale(exchange.pairs, triangle.a.pair);
    if (!priceScale || !priceScale.cost) {
      return;
    }
    // 检查最小交易数量
    let minAmount;
    if (triangle.a.coinFrom.toUpperCase() !== 'BTC') {
      minAmount = Helper.convertAmount(triangle.a.price, priceScale.cost, triangle.a.side).times(1.1);
    } else {
      minAmount = Helper.getConvertedAmount({
        side: triangle.a.side,
        exchangeRate: triangle.a.price,
        amount: priceScale.cost
      }).times(1.1);
    }

    if (triangle.a.side === 'sell' && free.isLessThanOrEqualTo(minAmount)) {
      logger.debug(`持有${free + ' ' + triangle.a.coinFrom},小于最低交易数量（${minAmount}）！！`);
      return;
    }
    // 查找最佳交易量
    const tradeAmount = Helper.getBaseAmountByBC(triangle, free, minAmount);

    // ---------------------- A点开始------------------------
    const tradeEdgeA = this.getMockTradeEdge(exchange.pairs, triangle.a, tradeAmount);
    if (!tradeEdgeA) {
      return;
    }
    tradeTriangle.a = tradeEdgeA;
    tradeTriangle.before = tradeEdgeA.amount;

    // ---------------------- B点开始------------------------
    let aAmount = tradeEdgeA.amount;
    if (tradeEdgeA.side === 'sell') {
      tradeTriangle.before = tradeEdgeA.amount;
      aAmount = +Helper.getConvertedAmount({
        side: tradeEdgeA.side,
        exchangeRate: tradeEdgeA.price,
        amount: tradeEdgeA.amount
      }).toFixed(8);
    } else {
      tradeTriangle.before = +Helper.convertAmount(tradeEdgeA.price, tradeEdgeA.amount, tradeEdgeA.side).toFixed(8);
    }
    const bAmount = Helper.getConvertedAmount({
      side: triangle.b.side,
      exchangeRate: triangle.b.price,
      amount: +aAmount.toFixed(8)
    });
    const tradeEdgeB = this.getMockTradeEdge(exchange.pairs, triangle.b, bAmount);
    if (!tradeEdgeB) {
      return;
    }
    tradeTriangle.b = tradeEdgeB;

    // ---------------------- C点开始------------------------
    let cAmount = bAmount;
    if (triangle.c.side === 'buy') {
      cAmount = Helper.getConvertedAmount({
        side: triangle.c.side,
        exchangeRate: triangle.c.price,
        amount: tradeEdgeB.amount
      });
    }
    const tradeEdgeC = this.getMockTradeEdge(exchange.pairs, triangle.c, cAmount);
    if (!tradeEdgeC) {
      return;
    }
    tradeTriangle.c = tradeEdgeC;

    // const after = tradeTriangle.c.amount;
    const after = Helper.getConvertedAmount({
      side: tradeTriangle.c.side,
      exchangeRate: tradeTriangle.c.price,
      amount: tradeTriangle.c.amount
    })
    tradeTriangle.after = +after.toFixed(8);

    const profit = new BigNumber(after).minus(tradeTriangle.before);
    // 利润
    tradeTriangle.profit = profit.toFixed(8);
    if (profit.isLessThanOrEqualTo(0)) {
      logger.info(`订单可行性检测结果，利润(${clc.redBright(tradeTriangle.profit)})为负数，终止下单！`);
      return tradeTriangle;
    }
    tradeTriangle.id = triangle.id;
    // 利率
    tradeTriangle.rate =
      profit
        .div(tradeTriangle.before)
        .times(100)
        .toFixed(3) + '%';
    tradeTriangle.ts = Date.now();
    logger.info(clc.yellowBright('----- 模拟交易结果 -----'));
    logger.info(`套利货币：${tradeTriangle.coin}`);
    logger.info(`套利前资产：${tradeTriangle.before}, 套利后资产：${tradeTriangle.after}`);
    logger.info(`利润：${clc.greenBright(tradeTriangle.profit)}, 利率：${clc.greenBright(tradeTriangle.rate)}`);
    return tradeTriangle;
  }
}
