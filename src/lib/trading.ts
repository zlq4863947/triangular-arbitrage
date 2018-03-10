import { BigNumber } from 'bignumber.js';
import * as ccxt from 'ccxt';
import { logger, Helper } from './common';
import { ApiHandler } from './api-handler';
import * as types from './type';

const clc = require('cli-color');

export class Trading extends ApiHandler {
  balances!: types.IBalances;
  private worker = 0;

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
    let tradeAmount;
    if (edge.side.toLowerCase() === 'buy') {
      const tradecost = new BigNumber(feeRate).plus(1);
      // 可购买货币的数量 = (基础货币交易额度/货币价格)x(1+手续费)
      tradeAmount = fmAmount.div(edge.price).times(tradecost);
    } else {
      const tradecost = new BigNumber(1).minus(feeRate);
      // 可购买货币的数量 = (基础货币交易额度x价格)x(1-手续费)
      // tradeAmount = fmAmount.times(edge.price).times(tradecost);
      tradeAmount = fmAmount.times(tradecost);
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
    }
    tradeAmount = Helper.formatTradeAmount(tradeAmount, edge.price, edge.side, priceScale);
    tradeEdge.fee = tradeAmount.times(feeRate).toFixed(8) + ' ' + edge.coinTo;
    tradeEdge.amount = +tradeAmount.toFixed(8);
    tradeEdge.bigAmount = tradeAmount;
    tradeEdge.price = edge.price;
    tradeEdge.timecost = Helper.endTimer(timer);
    return tradeEdge;
  }

  // 订单执行前，可行性检查
  async testOrder(exchange: types.IExchange, triangle: types.ITriangle) {
    logger.debug(`三角套利组合：${triangle.id}, 订单可行性检测...`);
    if (!exchange.endpoint.private || !exchange.pairs) {
      logger.error('交易所相关参数出错！！');
      return;
    }

    // 查询资产
    const balances = await this.getBalance(exchange);
    if (!balances) {
      logger.error('未查找到持有资产！！');
      return;
    }
    this.balances = balances;

    const tradeTriangle = <types.ITradeTriangle>{
      coin: triangle.a.coinFrom,
    };

    const asset = this.balances[tradeTriangle.coin];
    if (!asset) {
      logger.error(`未查找到持有${tradeTriangle.coin}！！`);
      return;
    }
    const free = new BigNumber(asset.free);
    if (free.isZero()) {
      logger.error(`未查找到持有${tradeTriangle.coin}！！`);
      return;
    }
    const tradeAmount = Helper.getBaseAmountByBC(triangle, free);

    logger.debug(JSON.stringify(triangle));

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

    let before;
    if (tradeTriangle.a.side.toLowerCase() === 'buy') {
      before = new BigNumber(tradeTriangle.a.amount).times(tradeTriangle.a.price);
    } else {
      before = new BigNumber(tradeTriangle.a.amount).div(tradeTriangle.a.price);
    }
    tradeTriangle.before = +before.toFixed(8);

    const after = tradeTriangle.c.amount;
    tradeTriangle.after = +after.toFixed(8);

    const profit = new BigNumber(after).minus(before);
    // 利润
    tradeTriangle.profit = profit.toFixed(8);
    if (profit.isLessThanOrEqualTo(0)) {
      logger.debug(`订单可行性检测结果，利润(${clc.redBright(tradeTriangle.profit)})为负数，终止下单！`);
      return;
    }
    // 利率
    tradeTriangle.rate =
      profit
        .div(before)
        .times(100)
        .toFixed(3) + '%';
    tradeTriangle.ts = Date.now();
    logger.debug(`模拟交易，套利货币：${tradeTriangle.coin}`);
    logger.debug(`套利前资产：${tradeTriangle.before}, 套利后资产：${tradeTriangle.after}`);
    logger.debug(`利润：${clc.greenBright(tradeTriangle.profit)}, 利率：${clc.greenBright(tradeTriangle.rate)}`);
    return tradeTriangle;
  }

  // 下单
  async placeOrder(exchange: types.IExchange, triangle: types.ITriangle) {
    try {
      const testTrade = await this.testOrder(exchange, triangle);
      // 未通过检查时返回
      if (!testTrade) {
        return;
      }

      logger.info('----- 套利开始 -----');
      logger.info(`路径：${clc.cyanBright(triangle.id)} 利率: ${triangle.rate}`);

      // 获取交易额度
      logger.info(`第一步：${clc.blueBright(triangle.a.pair)}`);
      const tradeA = testTrade.a;
      logger.info(`限价：${tradeA.price}, 数量：${tradeA.amount}, 方向：${tradeA.side}`);
      const order = <types.IOrder>{
        symbol: tradeA.pair,
        side: tradeA.side.toLowerCase(),
        type: 'limit',
        price: tradeA.price,
        amount: tradeA.amount
      };
      const orderInfo = await this.createOrder(exchange, order);
      if (!orderInfo) {
        return;
      }
      logger.debug(`下单返回值: ${JSON.stringify(orderInfo, null, 2)}`);

      const nextB = async () => {
        logger.info('执行nextB...');
        const status = await this.queryOrderStatus(exchange, orderInfo.id, orderInfo.symbol);
        logger.info(`查询订单状态： ${status}`);
        // 交易成功时
        if (status === 'closed') {
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
    }
  }

  async orderB(exchange: types.IExchange, trade: types.ITradeTriangle) {
    logger.info(`第二步：${clc.blueBright(trade.b.pair)}`);
    try {
      const tradeB = trade.b;
      logger.info(`限价：${tradeB.price}, 数量：${tradeB.amount}, 方向：${tradeB.side}`);
      const order = <types.IOrder>{
        symbol: tradeB.pair,
        side: tradeB.side.toLowerCase(),
        type: 'limit',
        price: tradeB.price,
        amount: tradeB.amount
      };
      const orderInfo = await this.createOrder(exchange, order);
      if (!orderInfo) {
        return;
      }
      logger.debug(`下单返回值: ${JSON.stringify(orderInfo, null, 2)}`);

      const nextC = async () => {
        logger.info('执行nextC...');
        const status = await this.queryOrderStatus(exchange, orderInfo.id, orderInfo.symbol);
        logger.info(`查询订单状态： ${status}`);
        // 交易成功时
        if (status === 'closed') {
          if (this.worker) {
            clearInterval(this.worker);
          }
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
    }
  }

  async orderC(exchange: types.IExchange, trade: types.ITradeTriangle) {
    logger.info(`第三步：${clc.blueBright(trade.c.pair)}`);
    try {
      const tradeC = trade.c;
      logger.info(`限价：${tradeC.price}, 数量：${tradeC.amount}, 方向：${tradeC.side}`);
      const order = <types.IOrder>{
        symbol: tradeC.pair,
        side: tradeC.side.toLowerCase(),
        type: 'limit',
        price: tradeC.price,
        amount: tradeC.amount
      };
      const orderInfo = await this.createOrder(exchange, order);
      if (!orderInfo) {
        return;
      }
      logger.debug(`下单返回值: ${JSON.stringify(orderInfo, null, 2)}`);

      const completedC = async () => {
        logger.info('completedC...');
        const status = await this.queryOrderStatus(exchange, orderInfo.id, orderInfo.symbol);
        logger.info(`查询订单状态： ${status}`);
        // 交易成功时
        if (status === 'closed') {
          if (this.worker) {
            clearInterval(this.worker);
          }
          logger.info(`三角套利完成...`);
          return true;
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
    }
  }
}
