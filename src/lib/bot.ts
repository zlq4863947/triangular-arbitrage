import { Trading } from './trading';
import { PairRanker } from './pair-ranker';
import { CurrencyCore } from './currency-core';
import { ICtrl, IStream } from './type';

export class Bot {
  // database: Database;
  pairRanker: PairRanker;
  ctrl: ICtrl;
  trading: Trading;

  constructor(ctrl: ICtrl) {
    // this.database = new Database();
    this.pairRanker = new PairRanker();
    this.ctrl = ctrl;
    this.ctrl.currencyCore = new CurrencyCore(this.ctrl);
    this.trading = new Trading(this.ctrl.options.trading, this.ctrl.currencyCore, this.ctrl.logger);
    this.ctrl.storage.streamTick = async (stream: IStream, streamId: string) => {
      this.ctrl.storage.streams[streamId] = stream;

      if (streamId === 'allMarketTickers') {
        // 运行逻辑来检查套利机会
        this.ctrl.storage.candidates = this.ctrl.currencyCore.getDynamicCandidatesFromStream(stream, this.ctrl.options.arbitrage);

        // 运行逻辑检查每个交易对排名
        const pairToTrade = this.pairRanker.getPairRanking(this.ctrl.storage.candidates, this.ctrl.storage.pairRanks, this.ctrl);
        if (pairToTrade !== 'none' && this.ctrl.storage.trading.active.length === 0) {
          // this.ctrl.storage.trading.active.push(pairToTrade);
          // const res = await this.trading.placeOrder(this.ctrl.exchange, pairToTrade);
          await this.trading.testOrder(this.ctrl.exchange, pairToTrade);
          // console.log("<----GO TRADE---->");
        }

        // 队列的潜在交易
        if (this.trading) {
          this.trading.updateCandidateQueue(stream, this.ctrl.storage.candidates, this.ctrl.storage.trading.queue);
        }

        // 在UI中，为每个交易对更新最新值
        this.ctrl.UI.updateArbitageOpportunities(this.ctrl.storage.candidates);
      }
    };
  }

  async start() {
    // 加载CurrencyCore,启动数据流
    this.ctrl.logger.info('--- 启动交易对数据流');
    await this.ctrl.currencyCore.start();
  }
}
