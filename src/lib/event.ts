import { EventEmitter } from 'events';
// import { Trading } from './trading';
import { Storage } from './storage';
import * as types from './type';
import { logger, Helper } from './common';

/**
 * 通用事件处理器
 */
export class Event extends EventEmitter {
  // trading: Trading;
  storage: Storage;

  constructor() {
    super();
    // this.trading = new Trading();
    this.storage = new Storage();
    this.on('placeOrder', this.onPlaceOrder);
    this.on('updateArbitage', this.onUpdateArbitage);
  }

  async onPlaceOrder(exchange: types.IExchange, triangle: types.ITriangle) {
    const timer = Helper.getTimer();
    logger.debug('执行订单事件[开始]');
    logger.info('onPlaceOrder');
    logger.info(JSON.stringify(triangle, null, 2));
    // await this.trading.placeOrder(exchange, triangle);
    logger.debug(`执行订单事件[终了] ${Helper.endTimer(timer)}`);
  }

  async onUpdateArbitage(triangles: types.ITriangle[]) {
    const timer = Helper.getTimer();
    logger.debug('更新排行事件[开始]');
    logger.info('onUpdateArbitage');
    const ranks = Helper.getRanks(triangles);
    await this.storage.put(ranks);
    logger.debug(`更新排行事件[终了] ${Helper.endTimer(timer)}`);
  }
}
