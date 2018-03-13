import * as types from '../type';
import { logger } from '../common';
import { StorageBase } from './base';
const config = require('config');

export class Queue extends StorageBase {
  static id = 'queue';

  constructor(url: string) {
    super(url + Queue.id);
  }

  async addQueue(queue: types.IQueue) {
    try {
      if (!queue.ts) {
        queue.ts = Date.now();
      }
      logger.debug('存入队列数据：' + JSON.stringify(queue));
      return await this.post(queue);
    } catch (err) {
      logger.error(`存储队列数据出错: ${err.message}`);
    }
  }

  async getQueue(trade: types.ITradeTriangle) {
    const queueRes = await this.findQueue({
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

  async findQueue(selecter: { [attr: string]: any }) {
    await this.createIndex({
      index: {
        fields: ['triangleId']
      }
    })
    return await this.find({ selector: selecter });
  }

  async removeQueue(id: string) {
    const doc = await this.get(id);
    return await this.remove(doc);
  }
}
