import * as types from '../type';
import { logger } from '../common';
import { StorageBase } from './base';
const config = require('config');

export class Queue extends StorageBase {
  static id = 'queue';

  constructor(url: string) {
    super(url + Queue.id);
  }

  private getId(queue: types.IQueue) {
    return queue.exchange + '_' + queue.triangleId;
  }

  async addQueue(queue: types.IQueue) {
    try {
      if (!queue._id) {
        queue._id = this.getId(queue);
      }
      if (!queue.ts) {
        queue.ts = Date.now();
      }
      logger.debug('存入队列数据：' + JSON.stringify(queue));
      return await this.put(queue);
    } catch (err) {
      logger.error(`存储队列数据出错: ${err.message}`);
    }
  }

  async getQueue(queue: types.IQueue) {

    const docs = await this.allDocs({
      include_docs: true,
      attachments: true,
    });
    if (!docs) {
      return;
    }
    const id = this.getId(queue);
    return docs.rows.find(o => o.id === id);
  }

  async removeQueue(queue: types.IQueue) {

    const docs = await this.allDocs({
      include_docs: true,
      attachments: true,
    });
    if (!docs) {
      return;
    }
    const id = this.getId(queue);
    const row = docs.rows.find(o => o.id === id);
    if (!row || !row.doc) {
      return;
    }
    await this.remove(row.doc._id, row.doc._rev);
  }
}
