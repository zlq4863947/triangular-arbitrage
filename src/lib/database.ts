import { log } from 'winston';
import * as mongodb from 'mongodb';
const config = require('config');

export class Database {
  async startup(logger: any) {
    if (!config.useMongo) {
      return;
    }
    logger.info('--- 准备MongoDB存储');
    let authStr = '',
      authMechanism;

    if (config.mongoUser) {
      authStr = encodeURIComponent(config.mongoUser);

      if (config.mongoPass) authStr += ':' + encodeURIComponent(config.mongoPass);
      authStr += '@';

      // authMechanism可以是一个conf.ini参数来支持更多的mongodb认证方法
      authMechanism = 'DEFAULT';
    }

    const url =
      'mongodb://' +
      authStr +
      config.mongoHost +
      ':' +
      config.mongoPort +
      '/' +
      config.mongoDb +
      '?' +
      (authMechanism ? '&authMechanism=' + authMechanism : '');
    try {
      const client = await mongodb.MongoClient.connect(url);
      return client.db(config.mongoDb);
    } catch (err) {
      console.error('WARNING: MongoDB连接错误: ', err);
      console.error('WARNING: 没有MongoDB，某些功能（例如历史日志和指标）可能会被禁用。');
      console.error('尝试认证字符串: ' + url);
      logger.error('--- \tMongoDB连接失败，请参阅debug.log以获取详细信息');
      logger.debug('--- \tMongoDB连接字符串: ' + url);
    }
  }

  // 将WebSocket raw tick保存到数据库
  async saveRawTick(rows: any[], db: mongodb.Db, logger: any) {
    let rawTickTable = db.collection(config.rawTicksTable);
    try {
      const res = await rawTickTable.insertMany(rows);
      logger.debug('----- 记录 ' + res.result.n + ' raw ticks 放入数据库');
      return true;
    } catch (err) {
      logger.error('--- 方法saveRawTick()出错: ' + err);
      return false;
    }
  }

  // 将套利计算tick保存至数据库供日后分析
  async saveArbRows(rows: any[], db: mongodb.Db, logger: any) {
    let arbitrageTicksTable = db.collection(config.arbitrageTicksTable);

    // console.log("----- saveArbRows()")
    // console.log("flipped: ", rows[0].a.flipped)
    // console.log(rows[0].a.stepFrom, rows[0].a.stepTo)
    // console.log(rows[0].a_step_from, rows[0].a_step_to)

    try {
      const res = await arbitrageTicksTable.insertMany(rows);
      logger.debug('----- 记录 ' + res.result.n + ' raw ticks 放入数据库');
      return true;
    } catch (err) {
      logger.error('--- 方法saveArbRows()出错: ' + err);
      return false;
    }
  }
}
