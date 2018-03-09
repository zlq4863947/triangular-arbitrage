import * as types from '../type';
import { logger } from '../common';
import { StorageBase } from './base';
const config = require('config');

export class Rank extends StorageBase {
  static id = 'rank';

  constructor(url: string) {
    super(url + Rank.id)
  }

  async putRanks(ranks: types.IRank[]) {
    try {
      logger.info('存入排行数据，大小：' + ranks.length)
      const docs = await this.allDocs({
        include_docs: true,
        attachments: true,
      });
      if (docs.rows.length > config.display.maxRows) {
        // 超过最大显示数时，清空数据库
        await this.removeAllDocs();
      }

      const removeList = [];
      for (let [i, row] of docs.rows.entries()) {
        if (ranks[i]) {
          ranks[i] = Object.assign({}, row.doc, ranks[i]);
        } else {
          removeList.push(row.doc);
        }
      }

      for (const doc of removeList) {
        if (doc) {
          await this.remove(doc);
        }
      }
      return await this.bulkDocs(ranks);
    } catch (err) {
      logger.error(`存储排行数据出错: ${err.message}`);
    }
  }
}
