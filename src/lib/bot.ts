import { Trading } from './trading';
import { Database } from './database';
import { PairRanker } from './pair-ranker';
import { CurrencyCore } from './currency-core';

export class Bot {
  database: Database;
  pairRanker: PairRanker;
  ctrl: any;
  trading: Trading;

  constructor(ctrl: any) {
    this.database = new Database();
    this.pairRanker = new PairRanker();
    this.ctrl = ctrl;
    this.trading = new Trading(this.ctrl.options.trading, this.ctrl.currencyCore);
    this.ctrl.storage.streamTick = (stream: any, streamId: string) => {
      this.ctrl.storage.streams[streamId] = stream;

      if (streamId === 'allMarketTickers') {
        // 运行逻辑来检查套利机会
        this.ctrl.storage.candidates = this.ctrl.currencyCore.getDynamicCandidatesFromStream(stream, this.ctrl.options.arbitrage);

        // 运行逻辑检查每个交易对排名
        var pairToTrade = this.pairRanker.getPairRanking(this.ctrl.storage.candidates, this.ctrl.storage.pairRanks, this.ctrl);
        if (pairToTrade != 'none') {
          // console.log("<----GO TRADE---->");
        }

        // 队列的潜在交易
        if (this.trading) {
          this.trading.updateCandidateQueue(stream, this.ctrl.storage.candidates, this.ctrl.storage.trading.queue);
        }

        // 在UI中，为每个交易对更新最新值
        this.ctrl.UI.updateArbitageOpportunities(this.ctrl.storage.candidates);

        if (this.ctrl.options.storage.logHistory) {
          // 将套利数据记录到数据库（如果启用）
          this.database.saveArbRows(this.ctrl.storage.candidates, this.ctrl.storage.db, this.ctrl.logger);
          this.database.saveRawTick(stream.arr, this.ctrl.storage.db, this.ctrl.logger);
        }
      }
    };
  }

  start() {
    // 加载CurrencyCore,启动数据流
    this.ctrl.logger.info('--- 启动交易对数据流');
    this.ctrl.currencyCore = new CurrencyCore(this.ctrl);
    this.ctrl.currencyCore.start();
  }
}
