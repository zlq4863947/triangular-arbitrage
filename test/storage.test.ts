import * as assert from 'power-assert';
import { Helper } from '../src/lib/common';
import { Storage } from '../src/lib/storage';
import { BigNumber } from 'bignumber.js';
import * as types from '../src/lib/type';
import * as PouchDB from 'pouchdb';
import * as find from 'pouchdb-find';
PouchDB.plugin(find);

const testPutDb = async () => {
  const storage = new Storage();
  const doc = {
    _id: 'mittens2',
    name: 'Mittens',
    occupation: 'kitten',
    age: 3,
    hobbies: ['playing with balls of yarn', 'chasing laser pointers', 'lookin hella cute'],
  };
  const res = await storage.rank.removeAllDocs();
  console.log(res);
  // const res = await storage.pouchDB.put(doc)
  // console.log('res: ', res)
  /* const info = await movies.info();
  console.log(info)
  const info2 = <any>await movies.get('mittens');
  console.log('info2: ', info2)
  info2.age = 2012
  await movies.put(info2);
  const info3 = await movies.get('mittens');
  console.log('info3: ', info3)*/
  /*
    const findData = await movies.find({
      selector: {
        name: 'Mittens'
      }
    });*/
  /*const findData = await movies.find({
    selector: {
      name: { '$gt': null }
    },
    limit: 10
  });
  console.log('findData: ', findData.docs);*/
};

const testRank = async () => {
  const storage = new Storage();
  const ranks: types.IRank[] = [];
  const rank: types.IRank = {
    stepA: 'ETH/BTC',
    stepB: 'DLT/ETH',
    stepC: 'DLT/BTC',
    rate: 0.05,
    fee: [0.005, 0.0025],
    profitRate: [0.045, 0.0475],
    ts: 1520516680000,
  };
  ranks.push(rank);
  const putRes = await storage.rank.post(rank);
  assert(putRes.id);
  // const putRes = await storage.rank.putRanks(ranks);
  console.log('putRes: ', JSON.stringify(putRes, null, 2));
  const res = await storage.rank.getAllDocs();
  console.log(res);
};

const testQueue = async () => {
  const storage = new Storage();
  const queue: types.IQueue = {
    triangleId: 'BNB-BTC-IOsTA',
    exchange: 'binance',
    step: 0,
  };
  // const res2 = await storage.queue.addQueue(queue);
  const res = await storage.queue.findQueue(queue.triangleId, queue.exchange);
  /*
    const res = await storage.queue.allDocs({
      include_docs: true,
      attachments: true,
    });*/
  assert(res);
  // const putRes = await storage.rank.putRanks(ranks);
  console.log('putRes: ', JSON.stringify(res, null, 2));
};

const testTrade = async () => {
  const storage = new Storage();
  const trades: types.ITradeTriangle[] = [];
  /*const trade: types.ITradeTriangle = {
    "_id": "1520516680001",
    "coin": "BTC2",
    "a": {
      "pair": "1ETH/BTC",
      "side": "buy",
      "fee": "0.00001001 ETH",
      "amount": 0.01000962,
      "bigAmount": new BigNumber("0.010009615"),
      "price": 0.078203,
      "timecost": "2.84 ms"
    },
    "b": {
      "pair": "OMG/ETH",
      "side": "buy",
      "fee": "0.00051117 OMG",
      "amount": 0.51117393,
      "bigAmount": new BigNumber("0.511173928"),
      "price": 0.0196,
      "timecost": "549 μs"
    },
    "c": {
      "pair": "OMG/BTC",
      "side": "sell",
      "fee": "0.00000078 BTC",
      "amount": 0.00078156,
      "bigAmount": new BigNumber("0.0078155766"),
      "price": 0.001534,
      "timecost": "716 μs"
    },
    "before": 0.00078278,
    "after": 0.00078156,
    "profit": "-0.00000122",
    "rate": "-0.156%",
    ts: 1520516680000,
  };
  trades.push(trade);
  await storage.trade.putTrades(trades);
  const res = await storage.trade.getAllDocs();
  console.log(JSON.stringify(res, null, 2));*/
};

describe('存储测试', () => {
  // it('测试pouchdb', testPutDb);
  // it('测试Rank', testRank);
  it('测试queue', testQueue);
  // it('测试Trade', testTrade);
});
