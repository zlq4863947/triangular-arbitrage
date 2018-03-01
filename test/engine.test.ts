import * as assert from 'power-assert';
import { Helper } from '../src/lib/common';
import { TriangularArbitrage } from '../src/lib/arbitrage';
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

const initRobot = async () => {
  const robot = new TriangularArbitrage();
  await robot.start();
  console.log(1);
};

describe('引擎测试', () => {
  it('查询交易所信息', exInfo);
  // it('初始化套利机器人', initRobot);
});
