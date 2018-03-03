import * as assert from 'power-assert';
import { Helper } from '../src/lib/common';
import { Trading } from '../src/lib/trading';
import * as types from '../src/lib/type';

const ccxt = require('ccxt');

const exId = types.ExchangeId.Binance;
const exchange = <types.IExchange>Helper.getExchange(types.ExchangeId.Binance);
const trading = new Trading();

const testFetchBalance = async () => {
  const res = await trading.getBalance(exchange);
  console.log(res)
}

const testMockOrder = async () => {
  const t = '{"id":"BTC-ETH-DLT","a":{"coinFrom":"BTC","coinTo":"ETH","pair":"ETH/BTC","side":"BUY","conversionRate":0.075077,"price":0.075077,"quantity":0.538},"b":{"coinFrom":"ETH","coinTo":"DLT","pair":"DLT/ETH","side":"BUY","conversionRate":0.00039193,"price":0.00039193,"quantity":97},"c":{"coinFrom":"DLT","coinTo":"BTC","pair":"DLT/BTC","side":"SELL","price":0.00002908,"quantity":121,"conversionRate":34387.8954607978},"rate":1.0118613689821185,"ts":1520099319732}';
  const triangle: types.ITriangle = JSON.parse(t);
  const res = await trading.testOrder(exchange, triangle);
  console.log(res)
}

describe('交易测试', () => {
  // it('测试获取资产', testFetchBalance)
  it('测试模拟下单', testMockOrder)
});
