import * as types from '../type';
import { logger } from '../common';
import { StorageBase } from './base';
const moment = require('moment');
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

  async updateQueue(queue: types.IQueue) {
    return await this.put(queue);
  }

  async getQueue(trade: types.ITradeTriangle) {
    const queueRes = await this.findQueue(trade.id, trade.exchange);
    // 队列中triangleId和exchange组合key是唯一的
    if (!queueRes || !queueRes.doc) {
      return;
    }
    return <types.IQueue>queueRes.doc;
  }

  async findQueue(triangleId: string, exchangeId: string) {
    /*await this.createIndex({
      index: {
        fields: ['triangleId']
      }
    })*/
    const docs = await this.allDocs({
      include_docs: true,
      attachments: true,
    });
    if (docs.rows.length > 0) {
      return docs.rows.find(o => {
        if (o.doc) {
          const queue = <types.IQueue>o.doc;
          return queue.triangleId === triangleId && queue.exchange === exchangeId;
        }
        return false;
      })
    }
  }

  async clearQueue() {
    const docs = await this.allDocs({
      include_docs: true,
      attachments: true,
    });
    for (const row of docs.rows) {
      if (!row.doc) {
        return;
      }
      const queue = <types.IQueue>row.doc;
      const timelimit = Date.now() - moment.duration(15, 'm').asMilliseconds();
      // 队列中数据超过15分钟时删除
      if (queue._id && queue.ts && timelimit > queue.ts) {
        await this.removeQueue(queue._id);
      }
    }
  }

  async removeQueue(id: string) {
    const doc = await this.get(id);
    return await this.remove(doc);
  }
}
