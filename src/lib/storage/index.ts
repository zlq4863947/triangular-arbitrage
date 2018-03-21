import * as types from '../type';
import { logger } from '../common';
import { Rank } from './rank';
import { Trade } from './trade';
import { Queue } from './queue';
const config = require('config');

export class Storage {
  url = '';
  rank: Rank;
  trade: Trade;
  queue: Queue;

  constructor() {
    if (config.storage.url) {
      this.url = config.storage.url;
    }
    this.rank = new Rank(this.url);
    this.trade = new Trade(this.url);
    this.queue = new Queue(this.url);
  }

  private async getQueue(tradeId: string, exchange: string) {
    const queueRes = await this.queue.findQueue(tradeId, exchange);
    // 队列中triangleId和exchange组合key是唯一的
    if (!queueRes || !queueRes.doc) {
      return;
    }
    return <types.IQueue>queueRes.doc;
  }

  /**
   * 打开交易会话
   */
  async openTradingSession(trade: types.ITrade) {
    if (!trade.mock.id || !trade.mock.exchange) {
      return;
    }
    const queueInfo = await this.queue.addQueue({
      triangleId: trade.mock.id,
      exchange: trade.mock.exchange,
      step: 0,
    });
    if (!queueInfo) {
      return;
    }
    trade._id = queueInfo.id;
    trade.mock.queueId = queueInfo.id;
    if (trade.real) {
      trade.real.queueId = queueInfo.id;
    }
    await this.trade.put(trade);
    return trade._id;
  }

  async updateTradingSession(trade: types.ITradeTriangle, step: types.tradeStep) {
    const queue = await this.getQueue(trade.id, trade.exchange);
    if (!queue || !queue._id) {
      return;
    }
    queue.step = step;
    await this.queue.put(queue);
    const oldTrade: types.ITrade = <any>await this.trade.get(queue._id);
    if (oldTrade.real) {
      switch (step) {
        case 0:
          oldTrade.real.a = trade.a;
          break;
        case 1:
          oldTrade.real.b = trade.b;
          break;
        case 2:
          oldTrade.real.c = trade.c;
          break;
      }
      return await this.trade.put(oldTrade);
    }
  }

  async closeTradingSession(trade: types.ITradeTriangle) {
    const queue = await this.getQueue(trade.id, trade.exchange);
    if (!queue || !queue._id || !queue._rev) {
      return;
    }
    await this.queue.remove(queue._id, queue._rev);
    const oldTrade: types.ITrade = <any>await this.trade.get(queue._id);
    if (oldTrade.real) {
      oldTrade.real.c = trade.c;
      return await this.trade.put(oldTrade);
    }
  }

  async clearQueue(tradeId: string, exchange: string) {
    const queue = await this.getQueue(tradeId, exchange);
    if (!queue || !queue._id || !queue._rev) {
      return;
    }
    await this.queue.remove(queue._id, queue._rev);
  }
}
