import { Trading } from './trading';
// import { CurrencyCore } from './currency-core';
import { Event } from './event';
import { logger } from './common';
import * as types from './type';

import { BigNumber } from 'BigNumber.js';

const config = require('config');

export class Bot extends Event {
  // trading: Trading;

  constructor() {
    super();

    // this.trading = new Trading(this.ctrl.options.trading, this.ctrl.currencyCore, this.ctrl.logger);
    /*this.ctrl.storage.streamTick = async (stream: IStream, streamId: string) => {
      this.ctrl.storage.streams[streamId] = stream;

      if (streamId === 'allMarketTickers') {
        // 运行逻辑来检查套利机会
        const candidates = this.ctrl.currencyCore.getDynamicCandidatesFromStream(stream, this.ctrl.options.arbitrage);

        // 获取排名
        const rankList = this.getRankList(candidates);

        let isTrading = false;
        if (rankList.length > 0 && rankList[0].details.netRate && config.minimalProfit) {
          // 判断是否满足盈利率
          isTrading = new BigNumber(rankList[0].details.netRate).isGreaterThanOrEqualTo(config.minimalProfit);
        }

        if (isTrading) {
          // this.ctrl.storage.trading.active.push(pairToTrade);
          // const res = await this.trading.placeOrder(this.ctrl.exchange, pairToTrade);
          // await this.trading.testOrder(this.ctrl.exchange, pairToTrade);
          this.emit('placeOrder', {});
          // console.log("<----GO TRADE---->");
        }

        // 在UI中，为每个交易对更新最新值
        // this.ctrl.UI.updateArbitageOpportunities(this.ctrl.storage.candidates);
      }
    };*/
  }

  async start() {
    // 加载CurrencyCore,启动数据流
    logger.info('--- 启动交易对数据流');
    // await this.ctrl.currencyCore.start();
  }

  // 获取排名
  getRankList(candidates: types.ICandidte[]) {
    return candidates.filter((candidte: types.ICandidte) => {
      // 过滤旧数据
      return candidte.details.ts > Date.now() - config.rank.pairTimer;
    });
  }
}
