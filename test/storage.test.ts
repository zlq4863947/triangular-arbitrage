import * as assert from 'power-assert';
import { Helper } from '../src/lib/common';
import { Storage } from '../src/lib/storage';
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
    ts: 1520516680000
  };
  ranks.push(rank);
  await storage.rank.putRanks(ranks);
  const res = await storage.rank.allDocs();
  console.log(res)
};

describe('存储测试', () => {
  // it('测试pouchdb', testPutDb);
  it('测试Rank', testRank);
});
