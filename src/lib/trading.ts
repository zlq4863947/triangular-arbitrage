import { logger, Helper } from './common';
import { BigNumber } from 'bignumber.js';
import { Bitbank } from 'bitbank-handler';
import * as types from './type';

export class Trading {

  balances!: types.IBalances;

  async getBalance(exchange: types.IExchange): Promise<types.IBalances | undefined> {
    /*const api = exchange.endpoint.rest;
    const account = await api.account();
    if (account) {
      return account.balances;
    }*/

    const api = exchange.endpoint.private;
    if (!api) {
      return;
    }
    switch (exchange.id) {
      case types.ExchangeId.Bitbank:
        const bitbank = (<Bitbank>api);
        // TODO
        return <any>await bitbank.getAssets().toPromise();
      default:
        return await api.fetchBalance();
    }
  }

  /**
   * 模拟每个边的交易信息
   * @param pairs 全市场交易对
   * @param edge 组合边
   * @param amount 待交易数量(A点可为空)
   */
  getMockTradeEdge(pairs: types.IPairs, edge: types.IEdge, amount?: number) {
    const tradeEdge = <types.ITradeEdge>{
      pair: edge.pair,
      side: edge.side
    };
    const timer = Helper.getTimer();

    const coinFrom = edge.coinFrom;
    const priceTotal = new BigNumber(edge.price).times(edge.quantity)
    // 获取基础货币交易额度
    let tradeAmount;
    if (amount) {
      tradeAmount = new BigNumber(amount);
    }
    // A点时自动计算交易数量
    else {
      const asset = this.balances[coinFrom];
      if (!asset) {
        logger.error(`未查找到持有${coinFrom}！！`);
        return;
      }

      const free = new BigNumber(asset.free);
      tradeAmount = Helper.getBaseTradeAmount(priceTotal, free);
    }
    // 获取交易精度
    const precision = Helper.getPriceScale(pairs, edge.pair);
    if (!precision) {
      logger.error(`未取得交易精度！！`);
      return;
    }
    logger.info(`基础货币[${coinFrom}],交易额度: ${tradeAmount}`)
    // 查询交易对手续费
    const feeRate = pairs[edge.pair].maker;
    if (!feeRate || feeRate <= 0) {
      logger.error(`未取得交易对的手续费！！`)
      return;
    }
    tradeEdge.fee = tradeAmount.times(feeRate).toFixed() + ' ' + coinFrom;
    if (edge.side.toLowerCase() === 'buy') {
      const tradecost = new BigNumber(feeRate).plus(1);
      // 可购买的数量 = (基础货币交易额度/货币价格)x(1+手续费)=>格式化最小交易单位(多余小数位向上舍入（充当手续费）)
      tradeEdge.amount = +tradeAmount.div(edge.price).times(tradecost).toFixed(precision.amount, 2);
    } else if (edge.side.toLowerCase() === 'sell') {
      let tradecost = new BigNumber(1).minus(feeRate);
      // 可购买的数量 = (基础货币交易额度x价格)x(1-手续费)=>格式化最小交易单位
      tradeEdge.amount = +tradeAmount.times(edge.price).times(tradecost).toFixed(amount ? precision.price : precision.amount, 1);
      /* else {
        // 可购买的数量 = (基础货币交易额度)x(1-手续费)=>格式化最小交易单位(多余小数位向下舍入（充当手续费）)
        tradeEdge.amount = +tradeAmount.times(tradecost).toFixed(precision.amount, 1);
      }*/
    }
    if (tradeEdge.amount <= 0) {
      logger.error(`可购买的数量<${tradeEdge.amount}>异常！！`);
      return;
    }
    tradeEdge.price = edge.price;
    tradeEdge.timecost = Helper.endTimer(timer);
    return tradeEdge;
  }

  // 订单执行前，可行性检查
  async testOrder(exchange: types.IExchange, triangle: types.ITriangle): Promise<boolean> {
    logger.info(`三角套利组合：${triangle.id}, 订单可行性检测...`);
    if (!exchange.endpoint.private || !exchange.pairs) {
      logger.error('交易所相关参数出错！！');
      return false;
    }

    // 查询资产
    const balances = await this.getBalance(exchange);
    if (!balances) {
      logger.error('未查找到持有资产！！');
      return false;
    }
    this.balances = balances;

    const tradeTriangle = <types.ITradeTriangle>{
      coin: triangle.a.coinFrom
    }

    // ---------------------- A点开始------------------------
    const tradeEdgeA = this.getMockTradeEdge(exchange.pairs, triangle.a);
    if (!tradeEdgeA) {
      return false;
    }
    tradeTriangle.a = tradeEdgeA;
    // logger.info(`交易模拟，A点交易信息:${JSON.stringify(tradeEdgeA, null, 2)}`);

    // ---------------------- B点开始------------------------
    const tradeEdgeB = this.getMockTradeEdge(exchange.pairs, triangle.b, tradeEdgeA.amount);
    if (!tradeEdgeB) {
      return false;
    }
    tradeTriangle.b = tradeEdgeB;
    // logger.info(`交易模拟，B点交易信息:${JSON.stringify(tradeEdgeB, null, 2)}`);

    // ---------------------- C点开始------------------------
    const tradeEdgeC = this.getMockTradeEdge(exchange.pairs, triangle.c, tradeEdgeB.amount);
    if (!tradeEdgeC) {
      return false;
    }
    tradeTriangle.c = tradeEdgeC;
    // logger.info(`交易模拟，C点交易信息:${JSON.stringify(tradeEdgeC, null, 2)}`);

    // 起始买入资金 = a点买入价 x 买入数量
    tradeTriangle.before = new BigNumber(tradeTriangle.a.price).times(tradeTriangle.a.amount).toNumber();
    // 套利后获得资金 = c点卖出价 x 卖出数量
    tradeTriangle.after = new BigNumber(tradeTriangle.c.price).times(tradeTriangle.c.amount).toNumber();
    // 利润
    tradeTriangle.profit = new BigNumber(tradeTriangle.after).minus(tradeTriangle.before).toNumber();
    if (tradeTriangle.profit <= 0) {
      logger.info(`订单可行性检测结果，利润(${tradeTriangle.profit})为负数，终止下单！`)
      return false;
    }
    // 利率
    tradeTriangle.rate = new BigNumber(tradeTriangle.profit).div(tradeTriangle.before).times(100).toFixed(3) + '%';
    logger.info(`模拟交易，套利结果: 套利货币：${tradeTriangle.coin}`);
    logger.info(`套利前资产：${tradeTriangle.before}, 套利后资产：${tradeTriangle.after}`);
    logger.info(`利润：${tradeTriangle.profit}, 利率：${tradeTriangle.rate}`);
    return true;
  }

  // 下单
  async placeOrder(exchange: types.IExchange, triangle: types.ITriangle) {

    try {

      // 未通过检查时返回
      if (!this.testOrder(exchange, triangle)) {
        return;
      }/*
      const free = new BigNumber(this.balances[triangle.a.coinFrom].free);
      const tradeAmount = new BigNumber(triangle.a.price).times(triangle.a.quantity)

      // 获取交易额度
      const buyMoney = Helper.getTradeAmount(tradeAmount, free);
      const quantity = (buyMoney / pairToTrade.a_bid_price).toFixed(this._currencyCore.getDecimalsNum(pairToTrade.a_symbol));
      logger.info('第一步');
      logger.info(`市价${pairToTrade.a_step_type}: ${pairToTrade.a_symbol},数量（${quantity}）,使用比特币（${buyMoney}）`);
      const order = {
        symbol: pairToTrade.a_symbol,
        side: pairToTrade.a_step_type,
        type: 'MARKET',
        quantity,
        timestamp: Date.now(),
      };
      const res = await api.newOrder(order);
      logger.info(`下单返回值: ${JSON.stringify(res, null, 2)}`);
      const nextB = async () => {
        logger.info('执行nextB...');
        const orderInfo = await api.queryOrder({
          symbol: order.symbol,
          orderId: res.orderId,
          origClientOrderId: res.clientOrderId,
        });
        logger.info(`查询订单状态： ${JSON.stringify(orderInfo, null, 2)}`);
        // 交易成功时
        if (orderInfo.status === 'FILLED') {
          if (this._worker) {
            clearInterval(this._worker);
          }
          await this.orderB(api, pairToTrade);
          return true;
        }
        return false;
      };

      // 订单未成交时
      if (!await nextB()) {
        logger.info('订单未成交,每秒循环执行。');
        this._worker = setInterval(nextB.bind(this), 1000);
      }*/
    } catch (err) {
      logger.error(`订单出错： ${err.message ? err.message : err.msg}`);
    }
  }
  /*
    async orderB(api: any, pairToTrade: any) {
      logger.info('第二步');
  
      try {
        // 查询资产
        const account = await api.account();
        if (!account) {
          logger.error(`未查询到账户!`);
          return;
        }
        const asset = (<Array<any>>account.balances).find((o: any, index: number, arr: any[]) => {
          return o.asset === pairToTrade.b_step_from;
        });
        if (!asset) {
          logger.error(`未查询出持有：${pairToTrade.b_step_from}`);
          return;
        }
        const freeMoney = +asset.free;
        // 这里总报错说余额不足，暂时只购买97%
        const quantity = (freeMoney / pairToTrade.b_bid_price * 0.97).toFixed(this._currencyCore.getDecimalsNum(pairToTrade.b_symbol));
        logger.info(
          `市价${pairToTrade.b_step_type}: ${pairToTrade.b_symbol},数量（${quantity}）,使用${pairToTrade.b_step_from}（${freeMoney}）`,
        );
        const order = {
          symbol: pairToTrade.b_symbol,
          side: pairToTrade.b_step_type,
          type: 'MARKET',
          quantity,
          timestamp: Date.now(),
        };
        const res = await api.newOrder(order);
        logger.info(`下单返回值: ${JSON.stringify(res, null, 2)}`);
  
        const nextC = async () => {
          logger.info('执行nextC...');
          const orderInfo = await api.queryOrder({
            symbol: order.symbol,
            orderId: res.orderId,
            origClientOrderId: res.clientOrderId,
          });
          logger.info(`查询订单状态： ${JSON.stringify(orderInfo, null, 2)}`);
          // 交易成功时
          if (orderInfo.status === 'FILLED') {
            if (this._worker) {
              clearInterval(this._worker);
            }
            await this.orderC(api, pairToTrade);
            return true;
          }
          return false;
        };
  
        // 订单未成交时
        if (!await nextC()) {
          logger.info('订单未成交,每秒循环执行。');
          this._worker = setInterval(nextC.bind(this), 1000);
        }
      } catch (err) {
        logger.error(`订单出错： ${err.message ? err.message : err.msg}`);
      }
    }
  
    async orderC(api: any, pairToTrade: any) {
      logger.info('第三步');
      try {
        // 查询资产
        const account = await api.account();
        if (!account) {
          logger.error(`未查询到账户!`);
          return;
        }
        const asset = (<Array<any>>account.balances).find((o: any, index: number, arr: any[]) => {
          return o.asset === pairToTrade.c_step_from;
        });
        if (!asset) {
          logger.error(`未查询出持有：${pairToTrade.c_step_from}`);
          return;
        }
        const freeMoney = +asset.free;
        const quantity = freeMoney.toFixed(this._currencyCore.getDecimalsNum(pairToTrade.c_symbol));
        this._last = pairToTrade.c_ask_price * +quantity;
        logger.info(
          `市价${pairToTrade.c_step_type}: ${pairToTrade.c_symbol},数量（${quantity}）,使用${pairToTrade.c_step_from}（${freeMoney}）`,
        );
        const order = {
          symbol: pairToTrade.c_symbol,
          side: pairToTrade.c_step_type,
          type: 'MARKET',
          quantity,
          timestamp: Date.now(),
        };
        const res = await api.newOrder(order);
        logger.info(`下单返回值: ${JSON.stringify(res, null, 2)}`);
  
        const completedC = async () => {
          logger.info('completedC...');
          const orderInfo = await api.queryOrder({
            symbol: order.symbol,
            orderId: res.orderId,
            origClientOrderId: res.clientOrderId,
          });
          logger.info(`查询订单状态： ${JSON.stringify(orderInfo, null, 2)}`);
          // 交易成功时
          if (orderInfo.status === 'FILLED') {
            if (this._worker) {
              clearInterval(this._worker);
            }
  
            logger.info(`三角套利完成（${pairToTrade.a_symbol}->${pairToTrade.b_symbol}）`);
            if (this._first && this._last) {
              // logger.info(`计算本次利润：(保有量[${this._last}]-前次保有量[${this._first}]）/前次保有量[${this._first}]*100% =
              // ${((this._last - this._first) / this._first * 100).toFixed(3)}%`);
              // 清空数值
              this._first = this._last = 0;
            }
            return true;
          }
          return false;
        };
  
        // 订单未成交时
        if (!await completedC()) {
          logger.info('订单未成交,每秒循环执行。');
          this._worker = setInterval(completedC.bind(this), 1000);
        }
      } catch (err) {
        logger.error(`订单出错： ${err.message ? err.message : err.msg}`);
      }
    }*/

  time() {
    // return this._started && Date.now() - this._started;
  }
}
