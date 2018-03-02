import { EventEmitter } from 'events';
// import { Trading } from './trading';
import * as types from './type';
import { logger, Helper } from './common';

/**
 * 通用事件处理器
 */
export class Event extends EventEmitter {
  // trading: Trading;

  constructor() {
    super();
    // this.trading = new Trading();
    this.on('placeOrder', this.onPlaceOrder);
    this.on('updateArbitage', this.onUpdateArbitage);
  }

  async onPlaceOrder(exchange: types.IExchange, triangle: types.ITriangle) {
    logger.info('onPlaceOrder');
    logger.info(JSON.stringify(triangle, null, 2));
    // await this.trading.placeOrder(exchange, triangle);
  }

  onUpdateArbitage(triangles: types.ITriangle[]) {
    logger.info('onUpdateArbitage');
    // logger.info(triangles);
  }
}
