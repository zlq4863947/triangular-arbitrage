import { EventEmitter } from 'events';

/**
 * 通用事件处理器
 */
export class Event extends EventEmitter {
  constructor() {
    super();
    this.on('placeOrder', this.onPlaceOrder);
  }

  onPlaceOrder() {}
}
