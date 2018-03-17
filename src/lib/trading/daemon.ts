import * as types from '../type';
import { Storage } from '../storage';
import { Order } from './order';

export class Daemon {

  storage: Storage;
  order: Order;

  constructor(storage: Storage) {
    this.storage = storage;
    this.order = new Order(this.storage);
  }

  // 重启套利流程
  async reboot(exchange: types.IExchange, trade: types.ITradeTriangle) {
    if (!trade.a.orderId) {
      // 退出交易队列
      await this.storage.clearQueue(trade.id, exchange.id);
      return true;
    } else if (!trade.b.orderId) {
      await this.order.orderB(exchange, trade);
      return true;
    } else if (!trade.c.orderId) {
      await this.order.orderC(exchange, trade);
      return true;
    }
    return false;
  }
}
