import * as types from '../type';
import { Storage } from '../storage';
import { Order } from './order';
import { logger } from '../common';
const clc = require('cli-color');

export class Daemon {

  storage: Storage;
  order: Order;

  constructor(storage: Storage) {
    this.storage = storage;
    this.order = new Order(this.storage);
  }

  private async clearError(queueId: string) {
    const res: types.IQueue = <any>await this.storage.queue.get(queueId);
    res.error = '';
    await this.storage.queue.updateQueue(res);
  }

  // 重启套利流程
  private async reboot(exchange: types.IExchange, trade: types.ITradeTriangle, queue: types.IQueue) {
    logger.info('----- 继续前次套利 -----');
    logger.info(`路径：${clc.cyanBright(trade.id)} 利率: ${trade.rate}`);
    // 第一步
    if (queue.step === 0) {
      if (!trade.a.orderId) {
        logger.info('A点订单为空，退出交易队列！');
        // 退出交易队列
        await this.storage.clearQueue(trade.id, exchange.id);
      } else {
        if (queue._id) {
          await this.clearError(queue._id);
          this.order.orderA(exchange, trade)
        }
      }
    } else if (queue.step === 1) {
      if (queue._id) {
        await this.clearError(queue._id);
      }
      await this.order.orderB(exchange, trade);
    } else if (queue.step === 2) {
      if (queue._id) {
        await this.clearError(queue._id);
      }
      await this.order.orderC(exchange, trade);
    }
  }

  // 继续处理失败的队列
  async continueTrade(exchange: types.IExchange) {
    const res = await this.storage.queue.allDocs({
      include_docs: true,
      attachments: true,
    });

    for (const row of res.rows) {
      if (!row.doc || !row.doc._id) {
        continue;
      }
      const queue = <types.IQueue>row.doc;
      if (!queue.error) {
        continue;
      }
      const trade: types.ITrade = <any>await this.storage.trade.get(row.doc._id);
      if (!trade.real) {
        continue;
      }
      await this.reboot(exchange, trade.real, queue);
    }
  }
}
