import { logger, Helper } from './common';
import { BigNumber } from 'BigNumber.js';
import * as types from './type';

export class Trading {
  async getBalance(exchange: types.IExchange) {
    /*const api = exchange.endpoint.rest;
    const account = await api.account();
    if (account) {
      return account.balances;
    }*/
    const api = exchange.endpoint.private;
    return await api.fetchBalance();
  }

  // 模拟下单
  async testOrder(exchange: types.IExchange, triangle: types.ITriangle) {
    try {
      // 查询资产
      const balances = await this.getBalance(exchange);
      if (!balances) {
        logger.info('未查找到持有资产！！');
        return;
      }

      /*const btcAsset = (<Array<any>>balances).find((o: any, index: number, arr: any[]) => {
        return o.asset === triangle.a.coinFrom;
      });*/
      const assetA = balances[triangle.a.coinFrom];

      if (!assetA) {
        logger.info(`未查找到持有${triangle.a.coinFrom}！！`);
        return;
      }

      logger.info('模拟下单...');
      const freeMoney = +assetA.free;
      // 使用1%的资产购买
      const buyCapital = new BigNumber(freeMoney).times(0.01);
      const profitRate = Helper.getTriangleRate(triangle.a, triangle.b, triangle.c);
      const afterCapital = buyCapital.times(profitRate);
      logger.info(
        `使用${triangle.a.coinFrom}：${Helper.toFixed(buyCapital)}，获得${triangle.a.coinFrom}: ${Helper.toFixed(
          afterCapital,
        )},盈利%：${profitRate}%`,
      );
      return true;
    } catch (err) {
      logger.error(`订单出错： ${err.message ? err.message : err.msg}`);
    }
  }
  /*
    // 下单
    async placeOrder(exchange: types.IExchange, triangle: types.ITriangle) {
      // logger.info(`pairToTrade: ${JSON.stringify(pairToTrade, null, 2)}`);
      const api = exchange.endpoint.private;
      if (!api) {
        logger.info('未查找到私有api，请检查是否设置,apikey！！');
        return;
      }
  
      try {
        // 查询资产
        const account = await api.account();
        if (!account) {
          logger.info('未查找到持有资产！！');
          return;
        }
        const btcAsset = (<Array<any>>account.balances).find((o: any, index: number, arr: any[]) => {
          return o.asset === triangle.a.coinFrom;
        });
        if (!btcAsset) {
          return;
        }
  
        const freeMoney = +btcAsset.free;
        // 使用1%的资产购买
        const buyMoney = (this._first = freeMoney * 0.01);
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
        }
      } catch (err) {
        logger.error(`订单出错： ${err.message ? err.message : err.msg}`);
      }
    }
  
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
    }
  
    time() {
      return this._started && Date.now() - this._started;
    }*/
}
