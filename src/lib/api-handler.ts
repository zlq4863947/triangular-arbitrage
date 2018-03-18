import * as ccxt from 'ccxt';
import * as types from './type';
import { Bitbank } from 'bitbank-handler';
import { logger, Helper } from './common';

export { ccxt };
export class ApiHandler {
  async getBalance(exchange: types.IExchange): Promise<types.IBalances | undefined> {
    const api = exchange.endpoint.private;
    if (!api) {
      return;
    }
    switch (exchange.id) {
      case types.ExchangeId.Bitbank:
        const bitbank = <Bitbank>api;
        // TODO
        return <any>await bitbank.getAssets().toPromise();
      default:
        return await api.fetchBalance();
    }
  }

  async getFreeAmount(exchange: types.IExchange, coin: string) {
    const balances = await this.getBalance(exchange);
    if (!balances) {
      return;
    }
    const asset = balances[coin];
    if (!asset) {
      logger.debug(`未查找到持有${coin}！！`);
      return;
    }
    return asset.free;
  }

  async createOrder(exchange: types.IExchange, order: types.IOrder): Promise<ccxt.Order | undefined> {
    const api = <ccxt.Exchange>exchange.endpoint.private;
    if (!api) {
      return;
    }
    return await api.createOrder(order.symbol, order.type, order.side, String(order.amount), String(order.price));
  }

  async queryOrder(exchange: types.IExchange, orderId: string, symbol: string): Promise<ccxt.Order | undefined> {
    const api = <ccxt.Exchange>exchange.endpoint.private;
    if (!api) {
      return;
    }
    return await api.fetchOrder(orderId, symbol);
  }

  async queryOrderStatus(exchange: types.IExchange, orderId: string, symbol: string) {
    const api = <ccxt.Exchange>exchange.endpoint.private;
    if (!api) {
      return;
    }
    return await api.fetchOrderStatus(orderId, symbol);
  }
}
