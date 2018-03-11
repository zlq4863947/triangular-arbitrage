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
  const t1 = '{"id":"ETH-BTC-ADA","a":{"coinFrom":"ETH","coinTo":"BTC","pair":"ETH/BTC","side":"sell","price":0.076252,"quantity":0.102,"conversionRate":13.11441011383308},"b":{"coinFrom":"BTC","coinTo":"ADA","pair":"ADA/BTC","side":"buy","conversionRate":0.00002348,"price":0.00002348,"quantity":591},"c":{"coinFrom":"ADA","coinTo":"ETH","pair":"ADA/ETH","side":"sell","price":0.00030802,"quantity":6147,"conversionRate":3246.5424323095904},"rate":0.03041329,"ts":1520536682458}';
  const t2 = '{"id":"BTC-ETH-SALT","a":{"coinFrom":"BTC","coinTo":"ETH","pair":"ETH/BTC","side":"buy","conversionRate":0.078563,"price":0.078563,"quantity":1.67},"b":{"coinFrom":"ETH","coinTo":"SALT","pair":"SALT/ETH","side":"buy","conversionRate":0.004515,"price":0.004515,"quantity":0.01},"c":{"coinFrom":"SALT","coinTo":"BTC","pair":"SALT/BTC","side":"sell","price":0.000355,"quantity":100.75,"conversionRate":2816.9014084507044},"rate":0.08120815,"ts":1520659933180}'
  const t3 = '{"id":"BTC-BNB-ZIL","a":{"coinFrom":"BTC","coinTo":"BNB","pair":"BNB/BTC","side":"buy","price":0.0008819,"quantity":8.94},"b":{"coinFrom":"BNB","coinTo":"ZIL","pair":"ZIL/BNB","side":"buy","price":0.00594,"quantity":0.8},"c":{"coinFrom":"ZIL","coinTo":"BTC","pair":"ZIL/BTC","side":"sell","price":0.00000525,"quantity":4534},"rate":0.21979633,"ts":1520682679007}';
  const t4 = '{"id":"BTC-ETH-OMG","a":{"coinFrom":"BTC","coinTo":"ETH","pair":"ETH/BTC","side":"buy","price":0.078203,"quantity":0.59},"b":{"coinFrom":"ETH","coinTo":"OMG","pair":"OMG/ETH","side":"buy","price":0.0196,"quantity":0.01},"c":{"coinFrom":"OMG","coinTo":"BTC","pair":"OMG/BTC","side":"sell","price":0.001534,"quantity":1.62},"rate":0.07967229,"ts":1520688553746}';
  const t5 = '{"id":"BTC-BNB-WABI","a":{"coinFrom":"BTC","coinTo":"BNB","pair":"BNB/BTC","side":"buy","price":0.0008758,"quantity":9.45},"b":{"coinFrom":"BNB","coinTo":"WABI","pair":"WABI/BNB","side":"buy","price":0.12955,"quantity":0.19},"c":{"coinFrom":"WABI","coinTo":"BTC","pair":"WABI/BTC","side":"sell","price":0.00011373,"quantity":688},"rate":123,"ts":1520688553746}';
  const t6 = '{"id":"ETH-BTC-PPT","a":{"coinFrom":"ETH","coinTo":"BTC","pair":"ETH/BTC","side":"sell","price":0.078001,"quantity":37.585},"b":{"coinFrom":"BTC","coinTo":"PPT","pair":"PPT/BTC","side":"buy","price":0.001782,"quantity":4.99},"c":{"coinFrom":"PPT","coinTo":"ETH","pair":"PPT/ETH","side":"sell","price":0.022907,"quantity":1.1},"rate":0.26761543,"ts":1520705623932}';
  const t7 = '{"id":"BTC-ETH-ICX","a":{"coinFrom":"BTC","coinTo":"ETH","pair":"ETH/BTC","side":"buy","price":0.079221,"quantity":0.19},"b":{"coinFrom":"ETH","coinTo":"ICX","pair":"ICX/ETH","side":"buy","price":0.003662,"quantity":70.9},"c":{"coinFrom":"ICX","coinTo":"BTC","pair":"ICX/BTC","side":"sell","price":0.0002903,"quantity":67.56},"rate":0.06642301,"ts":1520765253834}';
  const t8 = '{"id":"ETH-BNB-ONT","a":{"coinFrom":"ETH","coinTo":"BNB","pair":"BNB/ETH","side":"buy","price":0.01126,"quantity":0.41},"b":{"coinFrom":"BNB","coinTo":"ONT","pair":"ONT/BNB","side":"buy","price":0.1966,"quantity":5.85},"c":{"coinFrom":"ONT","coinTo":"ETH","pair":"ONT/ETH","side":"sell","price":0.0022154,"quantity":220},"rate":0.07607119,"ts":1520782545989}'
  const list = [t1, t2, t3, t4, t5, t6, t7, t8];
  for (const t of list) {
    const triangle: types.ITriangle = JSON.parse(t);
    // for (let i = 0; i < 10; i++) {
    try {
      const res = await trading.placeOrder(exchange, triangle);
      console.log('下单结果：', res);
    } catch (e) {
      console.log('下单异常：', e.stack);
    }
    // }
  }
};

describe('交易测试', () => {
  // it('测试获取资产', testFetchBalance)
  // it('测试模拟下单', testMockOrder);
  it('测试下单', testPlaceOrder);
});
