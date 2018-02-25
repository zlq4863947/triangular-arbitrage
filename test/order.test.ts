import * as assert from 'power-assert';
const config = require('config');
const api = require('binance');
const exchangeAPI = new api.BinanceRest({
  key: config.binance.apiKey,
  secret: config.binance.secret,
  timeout: parseInt(config.restTimeout), // 可选，默认为15000，请求超时为毫秒
  recvWindow: parseInt(config.restRecvWindow), // 可选，默认为5000，如果您收到时间戳错误，则增加
  disableBeautification: !config.restBeautify,
});
const testOrder = async () => {
  const unit = 0.0001;
  const orderInfo = {
    symbol: 'BNBBTC',
    side: 'BUY',
    type: 'MARKET',
    // timeInForce: 'GTC',
    quantity: unit,
    timestamp: Date.now()
  }
  /*const account = await exchangeAPI.account();
  if (account) {
    const btcAsset = (<Array<any>>account.balances).find((o: any, index: number, arr: any[]) => {
      return o.asset === 'BTC';
    })
    console.log(btcAsset)
  }*/
  const res = await exchangeAPI.testOrder(orderInfo);
  // assert(symbolInfo);
};
const exInfo = async () => {
  /*const account = await exchangeAPI.account();
  if (account) {
    const btcAsset = (<Array<any>>account.balances).find((o: any, index: number, arr: any[]) => {
      return o.asset === 'BTC';
    })
    console.log(btcAsset)
  }*/
  const res = await exchangeAPI.exchangeInfo();
  console.log(res)
  // assert(symbolInfo);
};

describe('订单测试', () => {
  // it('下达测试单', testOrder);
  it('查询交易所信息', exInfo);
});
