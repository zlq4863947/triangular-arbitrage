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
   * @param pairs 全市场交易对
   * @param edge 组合边
   * @param amount 待交易数量
   * @param step 当前步骤(ab:1,bc:2,ca:3)
   */
  getMockTradeEdge(pairs: types.IPairs, edge: types.IEdge, amount: BigNumber, step: 1 | 2 | 3) {
    const tradeEdge = <types.ITradeEdge>{
      pair: edge.pair,
      side: edge.side,
    };
    const timer = Helper.getTimer();

    const coinFrom = edge.coinFrom;
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
    // 可购买货币的数量
    let tradeAmount = Helper.getConvertedAmount({
      side: edge.side,
      exchangeRate: edge.price,
      amount: fmAmount.toNumber(),
    });
    if (edge.side.toLowerCase() === 'buy') {
      const tradecost = new BigNumber(feeRate).plus(1);
      // 可购买货币的数量 = 可购买货币的数量x(1+手续费)
      tradeAmount = tradeAmount.times(tradecost);
    } else {
      const tradecost = new BigNumber(1).minus(feeRate);
      // 可购买货币的数量 = 可购买货币的数量xx(1-手续费)
      tradeAmount = tradeAmount.times(tradecost);
    }
    if (tradeAmount.isZero()) {
      logger.debug(`可购买的数量<${tradeAmount.toFixed()}>异常！！`);
      return;
    }

    // 第一步时制约挂单数量
    if (step === 1) {
      logger.debug(`基础货币[${coinFrom}],交易额度: ${fmAmount.toFixed()}`);
      // 购买量 > 实际挂单量
      if (tradeAmount.isGreaterThan(edge.quantity)) {
        logger.debug(`购买量(${+tradeAmount.toFixed(8)}) > 实际挂单量(${edge.quantity}), 购买量改为：${edge.quantity}`);
        tradeAmount = new BigNumber(edge.quantity);
      }
      // 条件交易量（为了符合币安最小交易总价）
      tradeAmount = Helper.formatTradeAmount(tradeAmount, edge.price, edge.side, priceScale);
    }
    tradeEdge.fee = tradeAmount.times(feeRate).toFixed(8) + ' ' + edge.coinTo;
    tradeEdge.amount = +tradeAmount.toFixed(priceScale.amount, 1);
    tradeEdge.bigAmount = tradeAmount;
    tradeEdge.price = edge.price;
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
    // 如果a点为卖出时，检查是否满足最小下单总金额
    if (triangle.a.side === 'sell') {
      // 获取交易精度
      const priceScale = Helper.getPriceScale(exchange.pairs, triangle.a.pair);
      if (priceScale && priceScale.cost) {
        // 检查最小交易数量
        const minCostAmount = Helper.getConvertedAmount({
          side: triangle.a.side,
          exchangeRate: triangle.a.price,
          amount: priceScale.cost,
        });
        if (free.isLessThanOrEqualTo(minCostAmount)) {
          logger.debug(`持有${free + ' ' + triangle.a.coinFrom},小于最低交易数量（${minCostAmount}）！！`);
          return;
        }
      }
    }
    const tradeAmount = Helper.getBaseAmountByBC(triangle, free);

    // logger.info(JSON.stringify(triangle));

    // ---------------------- A点开始------------------------
    const tradeEdgeA = this.getMockTradeEdge(exchange.pairs, triangle.a, tradeAmount, 1);
    if (!tradeEdgeA) {
      return;
    }
    tradeTriangle.a = tradeEdgeA;

    // ---------------------- B点开始------------------------
    const tradeEdgeB = this.getMockTradeEdge(exchange.pairs, triangle.b, tradeEdgeA.bigAmount, 2);
    if (!tradeEdgeB) {
      return;
    }
    tradeTriangle.b = tradeEdgeB;

    // ---------------------- C点开始------------------------
    const tradeEdgeC = this.getMockTradeEdge(exchange.pairs, triangle.c, tradeEdgeB.bigAmount, 3);
    if (!tradeEdgeC) {
      return;
    }
    tradeTriangle.c = tradeEdgeC;

    // 获取交易前使用资金(反向推算)
    const before = Helper.getConvertedAmount({
      side: tradeTriangle.a.side === 'buy' ? 'sell' : 'buy',
      exchangeRate: tradeTriangle.a.price,
      amount: tradeTriangle.a.amount,
    });
    tradeTriangle.before = +before.toFixed(8);

    const after = tradeTriangle.c.amount;
    tradeTriangle.after = +after.toFixed(8);

    const profit = new BigNumber(after).minus(before);
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
        .div(before)
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
