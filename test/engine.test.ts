import * as assert from 'power-assert';
import { Helper } from '../src/lib/common';
import { TriangularArbitrage } from '../src/lib/arbitrage';
import * as types from '../src/lib/type';
import * as PouchDB from 'pouchdb';
import * as find from 'pouchdb-find';
PouchDB.plugin(find)

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

const testPouchDb = async () => {
  const movies = new PouchDB('db');
  const doc = {
    '_id': 'mittens2',
    'name': 'Mittens',
    'occupation': 'kitten',
    'age': 3,
    'hobbies': [
      'playing with balls of yarn',
      'chasing laser pointers',
      'lookin hella cute'
    ]
  };

   // const res = await movies.put(doc)
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
  const findData = await movies.find({
    selector: {
      name: {'$gt': null}
    },
    limit: 10
  });
  console.log('findData: ', findData.docs);
}

describe('引擎测试', () => {
  // it('查询交易所信息', exInfo);
  // it('初始化套利机器人', initRobot);
  it('测试pouchdb', testPouchDb)
});
