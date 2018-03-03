import * as types from './type';
import { logger, Helper } from './common';

export class Engine {
  limit: number;

  constructor(options: types.IEngineOptions) {
    this.limit = options.limit;
  }

  // 获取组合的边
  getEdge(tickers: types.ITickers, coinFrom: string, coinTo: string) {
    if ((!tickers && Object.keys(tickers).length === 0) || !coinFrom || !coinTo) {
      return;
    }

    // 查找匹配的ticker
    const buyTicker = tickers[coinTo + '/' + coinFrom];

    const edge = <types.IEdge>{ coinFrom, coinTo };
    if (buyTicker) {
      edge.pair = buyTicker.symbol;
      edge.side = 'buy';
      edge.price = edge.conversionRate = buyTicker.ask;
      edge.quantity = buyTicker.askVolume;
    } else {
      // 查找匹配的ticker
      const sellTicker = tickers[coinFrom + '/' + coinTo];
      if (!sellTicker) {
        return;
      }
      edge.pair = sellTicker.symbol;
      edge.side = 'sell';
      edge.price = sellTicker.bid;
      edge.quantity = sellTicker.bidVolume;
      edge.conversionRate = 1 / sellTicker.bid;
    }
    return edge;
  }

  // 获取三角套利信息
  private getTriangle(tickers: types.ITickers, abc: { a: string; b: string; c: string }) {
    if ((!tickers && Object.keys(tickers).length === 0) || !abc || !abc.a || !abc.b || !abc.c) {
      return;
    }
    const a = this.getEdge(tickers, abc.a, abc.b);
    const b = this.getEdge(tickers, abc.b, abc.c);
    const c = this.getEdge(tickers, abc.c, abc.a);
    if (!a || !b || !c) {
      return;
    }
    const rate = +Helper.getTriangleRate(a.price, b.price, c.price);
    return <types.ITriangle>{
      id: a.coinFrom + '-' + b.coinFrom + '-' + c.coinFrom,
      a,
      b,
      c,
      rate,
      ts: Date.now(),
    };
  }

  private findCandidates(exchange: types.IExchange, tickers: types.ITickers, aCoinfrom: string, aCoinTo: string) {
    if (!exchange.markets) {
      return;
    }
    const abc = {
      a: aCoinfrom.toUpperCase(),
      b: aCoinTo.toUpperCase(),
      c: 'findme'.toUpperCase(),
    };

    const aPairs = exchange.markets[abc.a];
    const bPairs = exchange.markets[abc.b];

    const aCoinToSet: { [coin: string]: types.IMarket } = {};
    aPairs.map((market: types.IMarket) => {
      aCoinToSet[market.base] = market;
    });

    // 去掉b点coin
    delete aCoinToSet[abc.b];

    /*
      通过BPair配对
    */
    const triangles: types.ITriangle[] = [];
    for (let i = 0; i < bPairs.length; i++) {
      const bPairMarket = bPairs[i];

      if (aCoinToSet[bPairMarket.base]) {
        const stepC = this.getEdge(tickers, bPairMarket.base, abc.a);

        // 匹配到路径C
        if (stepC) {
          abc.c = stepC.coinFrom;

          const triangle = this.getTriangle(tickers, abc);
          if (!triangle) {
            continue;
          }

          triangles.push(triangle);
        }
      }
    }
    return triangles;
  }

  async getCandidates(exchange: types.IExchange, tickers: types.ITickers, options: types.IArbitrageOptions) {
    let candidates: types.ITriangle[] = [];
    const paths = options.arbitrage.baseCoins;
    const api = exchange.endpoint.public || exchange.endpoint.private;
    if (!api || paths.length === 0) {
      return;
    }
    const timer = Helper.getTimer();
    logger.debug('getCandidates:获取全市场候选者[开始]');

    for (const path of options.arbitrage.baseCoins) {
      const foundCandidates = this.findCandidates(exchange, tickers, options.arbitrage.start, path);
      if (foundCandidates && foundCandidates.length > 0) {
        candidates = candidates.concat(foundCandidates);
      }
    }
    if (candidates.length) {
      candidates.sort((a, b) => {
        return b.rate - a.rate;
      });
    }

    // 淘汰落选者
    if (candidates.length > this.limit) {
      candidates = candidates.slice(0, this.limit);
    }

    logger.debug(`getCandidates:获取全市场候选者[终了] ${Helper.endTimer(timer)}`);
    return candidates;
  }
}
