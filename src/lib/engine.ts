import { CurrencySelector } from './currency-selector';
import * as types from './type';
import { IEdge, ITriangle } from './type';

export class Engine {

  // 每秒触发一次, 所有来自 Binance 的ticker数据
  events = {
    onAllTickerStream: (stream: any) => {
      const key = 'allMarketTickers';

      // Basic array from api arr[0].s = ETHBTC
      this.streams.allMarketTickers.arr = stream;

      // Mapped object arr[ETHBTC]
      this.streams.allMarketTickers.obj = stream.reduce((array: any[], current: any) => {
        array[current.s] = current;
        return array;
      }, {});

      // 仅具有特定市场数据的子对象
      for (let i = 0; i < this.steps.length; i++) {
        this.streams.allMarketTickers.markets[this.steps[i]] = stream.filter(
          (e: any) => e.s.endsWith(this.steps[i]) || e.s.startsWith(this.steps[i]),
        );
      }

      // 这里有点不对劲。 BNB列表没有BTC，虽然BTC列表也没有。

      if (this.controller && this.controller.storage.streamTick) {
        this.controller.storage.streamTick(this.streams[key], key);
      }
    },
  };

  getDecimalsNum(pair: string) {
    const symbol = this.exchangeInfo.symbols.find((o: any) => o.symbol === pair);
    if (symbol) {
      const sizeFilter = symbol.filters.find((o: any) => o.filterType === 'LOT_SIZE');
      if (sizeFilter) {
        const arr = (+sizeFilter.minQty).toString().split('.');
        if (arr.length > 1) {
          return arr[1].length;
        }
      }
    }
    return 0;
  }

  // 获取组合的边
  getEdge(tickers: types.ITicker[], coinFrom: string, coinTo: string) {
    if (tickers.length === 0 || !coinFrom || !coinTo) {
      return;
    }

    // 查找匹配的ticker
    const buyTicker = tickers.find((t: types.ITicker) => {
      return t.symbol === coinTo + '/' + coinFrom;
    });

    const edge = <types.IEdge>{ coinFrom, coinTo };
    if (buyTicker) {
      edge.pair = buyTicker.symbol;
      edge.side = 'BUY';
      edge.price = edge.conversionRate = buyTicker.ask;
      edge.quantity = buyTicker.askVolume;
    } else {
      // 查找匹配的ticker
      const sellTicker = tickers.find((t: types.ITicker) => {
        return t.symbol === coinFrom + '/' + coinTo;
      });
      if (!sellTicker) {
        return;
      }
      edge.pair = sellTicker.symbol;
      edge.side = 'SELL';
      edge.price = sellTicker.bid;
      edge.quantity = sellTicker.bidVolume;
      edge.conversionRate = 1 / sellTicker.bid;
    }

    return edge;
  }

  // 获取三角套利信息
  private getTriangle(tickers: types.ITicker[], abc: { a: string, b: string, c: string }) {
    if (tickers.length === 0 || !abc || !abc.a || !abc.b || !abc.c) {
      return;
    }
    const a = this.getEdge(tickers, abc.a, abc.b);
    const b = this.getEdge(tickers, abc.b, abc.c);
    const c = this.getEdge(tickers, abc.c, abc.a);
    if (!a || !b || !c) {
      return;
    }
    const netRate = a.conversionRate * b.conversionRate * c.conversionRate;
    return <types.ITriangle>{
      a, b, c,
      netRate,
      profitRate: netRate - netRate * 0.1,
      ts: Date.now(),
    };
  }

  private findCandidates(exchange: types.IExchange, tickers: types.ITicker[], aCoinfrom: string, aCoinTo: string) {
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
      aCoinToSet[market.quote] = market;
    });

    // 去掉b点coin
    delete aCoinToSet[abc.b];

    /*
      通过BPair配对
    */
    const triangles: ITriangle[] = [];
    for (let i = 0; i < bPairs.length; i++) {
      const bPairMarket = bPairs[i];

      if (aCoinToSet[bPairMarket.quote]) {

        const stepC = this.getEdge(tickers, bPairMarket.quote, abc.a);

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

    if (triangles.length) {
      triangles.sort((a, b) => {
        return b.netRate - a.netRate;
      });
    }

    return triangles;
  }

  async getCandidates(exchange: types.IExchange, options: types.IArbitrageOptions) {
    let candidates: types.ITriangle[] = [];
    const paths = [options.arbitrage.start].concat(options.arbitrage.baseCoins);
    const api = exchange.endpoint.public || exchange.endpoint.private;
    if (!api || paths.length === 0) {
      return;
    }
    const tickers = await api.fetchTickers();
    for (const path of paths) {
      const foundCandidates = this.findCandidates(exchange, tickers, options.arbitrage.start, path) ；
      if (foundCandidates && foundCandidates.length > 0) {
        candidates = candidates.concat(foundCandidates);
      }
    }

    if (candidates.length) {
      candidates.sort((a, b) => {
        return b.netRate - a.netRate;
      });
    }

    return candidates;
  }

  /*
    以 btc 开始
    假设通过 btc 购买 eth
    寻找通过 eth 的购买, 导致回到 btc。
  */
  getBTCETHCandidatesFromStream(stream: IStream) {
    const keys = {
      a: 'btc'.toUpperCase(),
      b: 'eth'.toUpperCase(),
      c: 'findme'.toUpperCase(),
    };

    const apairs = stream.markets.BTC;
    const bpairs = stream.markets.ETH;

    const akeys: { [attr: string]: any } = {};
    apairs.map((obj: any, i: number, array: any[]) => {
      akeys[obj.s.replace(keys.a, '')] = obj;
    });

    // prevent 1-steps
    delete akeys[keys.b];

    /*
      Loop through BPairs
        for each bpair key, check if apair has it too.
        If it does, run arbitrage math
    */
    const bmatches = [];
    for (let i = 0; i < bpairs.length; i++) {
      const bPairTicker = bpairs[i];
      bPairTicker.key = bPairTicker.s.replace(keys.b, '');

      // from B to C
      bPairTicker.startsWithKey = bPairTicker.s.startsWith(keys.b);

      // from C to B
      bPairTicker.endsWithKey = bPairTicker.s.endsWith(keys.b);

      if (akeys[bPairTicker.key]) {
        const match = bPairTicker;

        keys.c = match.key;

        const rate = this.getArbitageRate(stream, keys.a, keys.b, keys.c);
        const triangle = {
          a: keys.a,
          b: keys.b,
          c: keys.c,
          rate: rate,
        };
        // debugger;
        bmatches.push(triangle);
      }
    }

    if (bmatches.length) {
      bmatches.sort(function (a, b) {
        return parseFloat(String(b.rate)) - parseFloat(String(a.rate));
      });
    }
    return bmatches;
  }

  simpleArbitrageMath(stream: any, candidates: any) {
    if (!stream || !candidates) {
      return;
    }
    // EURUSD * (1/GBPUSD) * (1/EURGBP) = 1

    // start btc
    // via xUSDT
    // end btc

    const a = candidates['BTCUSDT'];
    const b = candidates['ETHUSDT'];
    const c = candidates['ETHBTC'];

    if (!a || isNaN(a) || !b || isNaN(b) || !c || isNaN(c)) {
      return;
    }

    // btcusd : (flip/usdEth) : ethbtc
    const d = a.b * (1 / b.b) * c.b;

    return d;
  }

  // 为所有选择器启动一个全局数据流。数据流每秒反馈一次信息:
  // https://github.com/binance-exchange/binance-official-api-docs/blob/master/web-socket-streams.md#all-market-tickers-stream
  startAllTickerStream(exchange: any) {
    if (!this.streams.allMarketTickers) {
      this.streams.allMarketTickers = {
        arr: [],
        markets: [],
        obj: {},
      };
    }

    this.sockets.allMarketTickerStream = exchange.WS.onAllTickerStream(this.events.onAllTickerStream);
  }

  // 为特定选择器启动数据流
  startWSockets(exchange: any, ctrl: any) {
    // 循环通过提供的 csv 选择器, 并为每条数据启动交易和orderBook sockets
    for (let i = 0; i < this.selectors.length; i++) {
      const selector = new CurrencySelector(this.selectors[i], exchange);

      this.currencies[selector.key] = selector;
      this.currencies[selector.key].handleEvent = ctrl.events.wsEvent;
      this.currencies[selector.key].startWSockets(ctrl.events);
    }
  }

  // 获取排名
  getRankList(candidates: types.ICandidte[], timeout: number) {
    return candidates.filter((candidte: types.ICandidte) => {
      // 过滤旧数据
      return candidte.details.ts > Date.now() - timeout;
    });
  }
}
