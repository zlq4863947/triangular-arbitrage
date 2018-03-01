import { EventEmitter } from 'events';
import { Trading } from './trading';
import * as types from './type';
import { IExchange } from './type';

/**
 * 通用事件处理器
 */
export class Event extends EventEmitter {
  trading: Trading;
  constructor() {
    super();
    this.trading = new Trading();
    this.on('placeOrder', this.onPlaceOrder);
  }

  async onPlaceOrder(exchange: IExchange, triangle: types.ITriangle) {
    await this.trading.placeOrder(exchange, triangle);
  }
}
