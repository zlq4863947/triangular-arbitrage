import * as assert from 'power-assert';
import { Helper } from '../src/lib/common';
import * as types from '../src/lib/type';
import { ApiHandler } from '../src/lib/api-handler';

const testCreateOrder = async () => {
  const exId = types.ExchangeId.Binance;
  const exchange = <types.IExchange>Helper.getExchange(types.ExchangeId.Binance);
  const api = new ApiHandler();
  const order: types.IOrder = {
    symbol: 'ETH/BTC',            // symbol in CCXT format
    amount: 0.014,            // amount of base currency
    price: 0.077845,             // float price in quote currency
    type: 'limit', // order type, 'market', 'limit' or undefined/None/null
    side: 'buy'
  };
  const res = await api.createOrder(exchange, order);
  console.log(res);
};

const testQueryOrder = async () => {
  const exId = types.ExchangeId.Binance;
  const exchange = <types.IExchange>Helper.getExchange(types.ExchangeId.Binance);
  const api = new ApiHandler();
  const res = await api.queryOrder(exchange, '98162639', 'ETH/BTC');
  console.log(res);
};

const testQueryOrderStatus = async () => {
  const exId = types.ExchangeId.Binance;
  const exchange = <types.IExchange>Helper.getExchange(types.ExchangeId.Binance);
  const api = new ApiHandler();
  const res = await api.queryOrderStatus(exchange, '98162639', 'ETH/BTC');
  console.log(res);
};

describe('API测试', () => {
  // it('测试下单', testCreateOrder);
  // it('测试订单查询', testQueryOrder);
  it('测试订单状态查询', testQueryOrderStatus);
});
