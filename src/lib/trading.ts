import { EventEmitter } from 'events';
import { CurrencyCore } from './currency-core';

export class Trading extends EventEmitter {
  _started: number;
  _minQueuePercentageThreshold: number;
  _minHitsThreshold: number;
  _currencyCore: CurrencyCore;
  _activeTrades: any;
  candidateQueue: any;

  constructor(opts: any, currencyCore: CurrencyCore) {
    super();

    if (!(this instanceof Trading)) return new Trading(opts, currencyCore);

    this._started = Date.now();
    this._minQueuePercentageThreshold = opts.minQueuePercentageThreshold ? opts.minQueuePercentageThreshold / 100 + 1 : 0;
    this._minHitsThreshold = opts.minHitsThreshold ? opts.minHitsThreshold : 0;
    this._currencyCore = currencyCore;
    this._activeTrades = {};
  }

  updateCandidateQueue(stream: any, candidates: any, queue: any) {
    const self = this;

    for (let i = 0; i < candidates.length; i++) {
      let cand = candidates[i];

      if (cand.rate >= this._minQueuePercentageThreshold) {
        let key = cand.a_step_from + cand.b_step_from + cand.c_step_from;

        // store in queue using trio key. If new, initialise rates and hits. Else increment hits by 1.
        if (!queue[key]) {
          cand.rates = [];
          cand.hits = 1;
          queue[key] = cand;
        } else {
          queue[key].hits++;
        }
        queue[key].rates.push(cand.rate);
      } else {
        // 结果按降序排序。
        // 中断循环，如果这个调用中的其余部分没有超过阈值，那么为什么还要浪费CPU呢？
        break;
      }
    }

    // 在队列的最开始放置最合适的候选
    if (queue) {
      queue.sort((a: any, b: any) => {
        return parseInt(b.hits) - parseInt(a.hits);
      });

      self.candidateQueue = queue;
      self.emit('queueUpdated', queue);
      self.processQueue(queue, stream, self.time());
    }

    return queue;
  }

  // 处理队列中的元素
  processQueue(queue: any, stream: any, time: number) {
    const self = this;
    let keys = Object.keys(queue);

    for (let i = 0; i < keys.length; i++) {
      let cand = queue[keys[i]];

      if (cand.hits >= this._minHitsThreshold) {
        let liveRate = self._currencyCore.getArbitageRate(stream, cand.a_step_from, cand.b_step_from, cand.c_step_from);
        if (liveRate && liveRate.rate >= this._minQueuePercentageThreshold) {
          self.emit('newTradeQueued', cand, self.time());

          // begin trading logic. Plan:
        }
      }
    }
  }

  time() {
    return this._started && Date.now() - this._started;
  }
}
