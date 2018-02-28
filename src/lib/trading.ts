import { EventEmitter } from 'events';
// import { CurrencyCore } from './currency-core';
import { ITradeInfo } from './type';

export class Trading extends EventEmitter {
  logger: any;
  _started: number;
  _minQueueRateThreshold: number;
  _minHitsThreshold: number;
  _currencyCore: any;
  _activeTrades: any;
  candidateQueue: any;
  _worker: number;
  _first: number;
  _last: number;

  constructor(opts: any, currencyCore: any, logger: any) {
    super();

    if (!(this instanceof Trading)) {
      return new Trading(opts, currencyCore, logger);
    }

    this._started = Date.now();
    // 最小队列百分比阈值
    this._minQueueRateThreshold = opts.minQueueRateThreshold ? opts.minQueueRateThreshold / 100 + 1 : 0;
    this._minHitsThreshold = opts.minHitsThreshold ? opts.minHitsThreshold : 0;
    this._currencyCore = currencyCore;
    this._activeTrades = {};
    this.logger = logger;
  }

  // 处理队列中的元素
  processQueue(queue: any, stream: any, time: number) {
    const self = this;
    const keys = Object.keys(queue);

    for (let i = 0; i < keys.length; i++) {
      const cand = queue[keys[i]];

      if (cand.hits >= this._minHitsThreshold) {
        const liveRate = self._currencyCore.getArbitageRate(stream, cand.a_step_from, cand.b_step_from, cand.c_step_from);
        if (liveRate && liveRate.rate >= this._minQueueRateThreshold) {
          self.emit('newTradeQueued', cand, self.time());

          // begin trading logic. Plan:
        }
      }
    }
  }

  // 模拟下单
  async testOrder(api: any, pairToTrade: any) {
    try {
      // 查询资产
      const account = await api.account();
      if (!account) {
        return;
      }
      const btcAsset = (<Array<any>>account.balances).find((o: any, index: number, arr: any[]) => {
        return o.asset === pairToTrade.a_step_from;
      });
      if (!btcAsset) {
        return;
      }

      const freeMoney = +btcAsset.free;
      // 使用1%的资产购买
      const buyBtc = freeMoney * 0.01;
      const afterBtc = buyBtc / pairToTrade.a_bid_price / pairToTrade.b_bid_price * pairToTrade.c_ask_price;
      this.logger.info('模拟下单...');
      this.logger.info(`使用btc：${buyBtc}，获得btc: ${afterBtc},盈利%：${((afterBtc - buyBtc) / buyBtc * 100).toFixed(3)}%`);
    } catch (err) {
      this.logger.error(`订单出错： ${err.stack ? err.stack : err.msg}`);
    }
  }

  // 下单
  async placeOrder(api: any, pairToTrade: any) {
    // this.logger.info(`pairToTrade: ${JSON.stringify(pairToTrade, null, 2)}`);

    try {
      // 查询资产
      const account = await api.account();
      if (!account) {
        return;
      }
      const btcAsset = (<Array<any>>account.balances).find((o: any, index: number, arr: any[]) => {
        return o.asset === pairToTrade.a_step_from;
      });
      if (!btcAsset) {
        return;
      }

      const freeMoney = +btcAsset.free;
      // 使用1%的资产购买
      const buyMoney = (this._first = freeMoney * 0.01);
      const quantity = (buyMoney / pairToTrade.a_bid_price).toFixed(this._currencyCore.getDecimalsNum(pairToTrade.a_symbol));
      this.logger.info('第一步');
      this.logger.info(`市价${pairToTrade.a_step_type}: ${pairToTrade.a_symbol},数量（${quantity}）,使用比特币（${buyMoney}）`);
      const order = {
        symbol: pairToTrade.a_symbol,
        side: pairToTrade.a_step_type,
        type: 'MARKET',
        quantity,
        timestamp: Date.now(),
      };
      const res = await api.newOrder(order);
      this.logger.info(`下单返回值: ${JSON.stringify(res, null, 2)}`);
      const nextB = async () => {
        this.logger.info('执行nextB...');
        const orderInfo = await api.queryOrder({
          symbol: order.symbol,
          orderId: res.orderId,
          origClientOrderId: res.clientOrderId,
        });
        this.logger.info(`查询订单状态： ${JSON.stringify(orderInfo, null, 2)}`);
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
        this.logger.info('订单未成交,每秒循环执行。');
        this._worker = setInterval(nextB.bind(this), 1000);
      }
    } catch (err) {
      this.logger.error(`订单出错： ${err.stack ? err.stack : err.msg}`);
    }
  }

  async orderB(api: any, pairToTrade: any) {
    this.logger.info('第二步');

    try {
      // 查询资产
      const account = await api.account();
      if (!account) {
        this.logger.error(`未查询到账户!`);
        return;
      }
      const asset = (<Array<any>>account.balances).find((o: any, index: number, arr: any[]) => {
        return o.asset === pairToTrade.b_step_from;
      });
      if (!asset) {
        this.logger.error(`未查询出持有：${pairToTrade.b_step_from}`);
        return;
      }
      const freeMoney = +asset.free;
      // 这里总报错说余额不足，暂时只购买97%
      const quantity = (freeMoney / pairToTrade.b_bid_price * 0.97).toFixed(this._currencyCore.getDecimalsNum(pairToTrade.b_symbol));
      this.logger.info(
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
      this.logger.info(`下单返回值: ${JSON.stringify(res, null, 2)}`);

      const nextC = async () => {
        this.logger.info('执行nextC...');
        const orderInfo = await api.queryOrder({
          symbol: order.symbol,
          orderId: res.orderId,
          origClientOrderId: res.clientOrderId,
        });
        this.logger.info(`查询订单状态： ${JSON.stringify(orderInfo, null, 2)}`);
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
        this.logger.info('订单未成交,每秒循环执行。');
        this._worker = setInterval(nextC.bind(this), 1000);
      }
    } catch (err) {
      this.logger.error(`订单出错： ${err.stack ? err.stack : err.msg}`);
    }
  }

  async orderC(api: any, pairToTrade: any) {
    this.logger.info('第三步');
    try {
      // 查询资产
      const account = await api.account();
      if (!account) {
        this.logger.error(`未查询到账户!`);
        return;
      }
      const asset = (<Array<any>>account.balances).find((o: any, index: number, arr: any[]) => {
        return o.asset === pairToTrade.c_step_from;
      });
      if (!asset) {
        this.logger.error(`未查询出持有：${pairToTrade.c_step_from}`);
        return;
      }
      const freeMoney = +asset.free;
      const quantity = freeMoney.toFixed(this._currencyCore.getDecimalsNum(pairToTrade.c_symbol));
      this._last = pairToTrade.c_ask_price * +quantity;
      this.logger.info(
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
      this.logger.info(`下单返回值: ${JSON.stringify(res, null, 2)}`);

      const completedC = async () => {
        this.logger.info('completedC...');
        const orderInfo = await api.queryOrder({
          symbol: order.symbol,
          orderId: res.orderId,
          origClientOrderId: res.clientOrderId,
        });
        this.logger.info(`查询订单状态： ${JSON.stringify(orderInfo, null, 2)}`);
        // 交易成功时
        if (orderInfo.status === 'FILLED') {
          if (this._worker) {
            clearInterval(this._worker);
          }

          this.logger.info(`三角套利完成（${pairToTrade.a_symbol}->${pairToTrade.b_symbol}）`);
          if (this._first && this._last) {
            // this.logger.info(`计算本次利润：(保有量[${this._last}]-前次保有量[${this._first}]）/前次保有量[${this._first}]*100% =
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
        this.logger.info('订单未成交,每秒循环执行。');
        this._worker = setInterval(completedC.bind(this), 1000);
      }
    } catch (err) {
      this.logger.error(`订单出错： ${err.stack ? err.stack : err.msg}`);
    }
  }

  time() {
    return this._started && Date.now() - this._started;
  }
}
