import * as types from '../type';
import { logger } from '../common';
import { StorageBase } from './base';
const config = require('config');

export class Trade extends StorageBase {
  static id = 'trade';

  constructor(url: string) {
    super(url + Trade.id);
  }

  async putTrades(trades: types.ITradeTriangle[]) {
    try {
      logger.debug('存入交易数据，大小：' + trades.length);
      return await this.bulkDocs(trades);
    } catch (err) {
      logger.error(`存储交易数据出错: ${err.message}`);
    }
  }
}
