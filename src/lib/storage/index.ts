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
    const queueRes = await this.queue.findQueue({
      selector: {
        triangleId: trade.id,
        exchange: trade.exchange
      }
    });
    // 队列中triangleId和exchange组合key是唯一的
    if (!queueRes || queueRes.docs.length !== 1) {
      return;
    }
    return <types.IQueue>queueRes.docs[0];
  }

  /**
   * 打开交易会话
   */
  async openTradingSession(trade: types.ITradeTriangle) {
    const queueInfo = await this.queue.addQueue({
      triangleId: trade.id,
      exchange: trade.exchange,
      step: 0
    });
    if (!queueInfo) {
      return;
    }
    const tradeInput: types.ITrade = {
      _id: queueInfo.id,
      mock: trade
    };
    return await this.trade.put(tradeInput);
  }

  async updateTradingSession(trade: types.ITradeTriangle, step: types.tradeStep) {

    const queue = await this.getQueue(trade);
    if (!queue || !queue._id) {
      return;
    }
    queue.step = step;
    await this.queue.put(queue);
    const tradeInfo = Object.assign({}, await this.trade.get(queue._id), trade);
    return await this.trade.put(tradeInfo);
  }

  async closeTradingSession(trade: types.ITradeTriangle) {

    const queue = await this.getQueue(trade);
    if (!queue || !queue._id || !queue._rev) {
      return;
    }
    await this.queue.remove(queue._id, queue._rev);
    const tradeInfo = Object.assign({}, await this.trade.get(queue._id), trade);
    return await this.trade.put(tradeInfo);
  }
}
