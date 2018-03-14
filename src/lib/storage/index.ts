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

  private async getQueue(trade: types.ITradeTriangle) {
    const queueRes = await this.queue.findQueue(trade.id, trade.exchange);
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
    const queueInfo = await this.queue.addQueue({
      triangleId: trade.mock.id,
      exchange: trade.mock.exchange,
      step: 0,
    });
    if (!queueInfo) {
      return;
    }
    trade._id = queueInfo.id;
    return await this.trade.put(trade);
  }

  async updateTradingSession(trade: types.ITradeTriangle, step: types.tradeStep) {
    const queue = await this.getQueue(trade);
    if (!queue || !queue._id) {
      return;
    }
    queue.step = step;
    await this.queue.put(queue);
    const tradeEdgeInfo = { real: {} };
    switch (step) {
      case 0:
        tradeEdgeInfo.real = {
          a: trade
        }
        break;
      case 1:
        tradeEdgeInfo.real = {
          b: trade
        }
        break;
      case 2:
        tradeEdgeInfo.real = {
          c: trade
        }
        break;
    }
    const tradeInfo = Object.assign({}, await this.trade.get(queue._id), tradeEdgeInfo);
    return await this.trade.put(tradeInfo);
  }

  async closeTradingSession(trade: types.ITradeTriangle) {
    const queue = await this.getQueue(trade);
    if (!queue || !queue._id || !queue._rev) {
      return;
    }
    await this.queue.remove(queue._id, queue._rev);
    const tradeInfo = Object.assign({}, await this.trade.get(queue._id), {
      real: {
        c: trade
      }
    });
    return await this.trade.put(tradeInfo);
  }
}
