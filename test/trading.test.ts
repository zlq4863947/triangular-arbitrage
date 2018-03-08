import * as assert from 'power-assert';
import { Helper } from '../src/lib/common';
import { Trading } from '../src/lib/trading';
import * as types from '../src/lib/type';
import { TriangularArbitrage } from '../src/lib/arbitrage';

const ccxt = require('ccxt');

const testFetchBalance = async () => {
  const exId = types.ExchangeId.Binance;
  const exchange = <types.IExchange>Helper.getExchange(types.ExchangeId.Binance);
  const trading = new Trading();
  const res = await trading.getBalance(exchange);
  console.log(res);
};

const testMockOrder = async () => {
  const exId = types.ExchangeId.Binance;
  const exchange = <types.IExchange>Helper.getExchange(types.ExchangeId.Binance);
  const trading = new Trading();
  const t =
    '{"id":"BTC-ETH-DLT","a":{"coinFrom":"BTC","coinTo":"ETH","pair":"ETH/BTC","side":"BUY","conversionRate":0.075077,"price":0.075077,"quantity":0.538},"b":{"coinFrom":"ETH","coinTo":"DLT","pair":"DLT/ETH","side":"BUY","conversionRate":0.00039193,"price":0.00039193,"quantity":97},"c":{"coinFrom":"DLT","coinTo":"BTC","pair":"DLT/BTC","side":"SELL","price":0.00002908,"quantity":121,"conversionRate":34387.8954607978},"rate":1.0118613689821185,"ts":1520099319732}';
  const triangle: types.ITriangle = JSON.parse(t);
  const res = await trading.testOrder(exchange, triangle);
  console.log(res);
};

const testPlaceOrder = async () => {
  const exId = types.ExchangeId.Binance;
  const arbitrage = new TriangularArbitrage();
  await arbitrage.initExchange(exId);
  const exchange = arbitrage.exchanges.get(exId);
  if (!exchange) {
    return;
  }
  const trading = new Trading();
  const t =
    '{"id":"ETH-BTC-ADA","a":{"coinFrom":"ETH","coinTo":"BTC","pair":"ETH/BTC","side":"sell","price":0.076252,"quantity":0.102,"conversionRate":13.11441011383308},"b":{"coinFrom":"BTC","coinTo":"ADA","pair":"ADA/BTC","side":"buy","conversionRate":0.00002348,"price":0.00002348,"quantity":591},"c":{"coinFrom":"ADA","coinTo":"ETH","pair":"ADA/ETH","side":"sell","price":0.00030802,"quantity":6147,"conversionRate":3246.5424323095904},"rate":0.03041329,"ts":1520536682458}';
  const triangle: types.ITriangle = JSON.parse(t);
  for (let i = 0; i < 10; i++) {
    try {
      const res = await trading.placeOrder(exchange, triangle);
      console.log(res);
    } catch (e) {
      console.log(e.stack)
    }
  }
};

describe('交易测试', () => {
  // it('测试获取资产', testFetchBalance)
  // it('测试模拟下单', testMockOrder);
  it('测试下单', testPlaceOrder);
});
