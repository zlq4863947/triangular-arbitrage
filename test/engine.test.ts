import * as assert from 'power-assert';
import { Helper } from '../src/lib/common';
import * as types from '../src/lib/type';

const exInfo = async () => {
  const ex = Helper.getExchange(types.ExchangeId.Binance);
  if (ex && ex.endpoint.private) {
    const api = ex.endpoint.private;
    const res = await api.loadMarkets();
    const res2 = await api.fetchTickers();
    console.log(res);
  }
  // assert(symbolInfo);
};

describe('引擎测试', () => {
  it('查询交易所信息', exInfo);
});
