import { CurrencySelector } from './currency-selector';
// import { IStreams, IStream, Binance24HrTicker, ICurrency, IArbitrage } from './type';

export class Engine {
  currencies: any;
  sockets: any;
  streams: any;
  controller: any;
  selectors: any;
  steps: string[];
  exchangeInfo: any;

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

  constructor(ctrl: any) {
    if (!ctrl.exchange) {
      throw new Error('未定义的交易所连接器。 将无法与交易所API进行通信。');
    }

    // Stores
    this.currencies = {};
    this.sockets = {};
    this.streams = {};
    this.controller = ctrl;
    this.steps = ['BTC', 'ETH', 'BNB', 'USDT'];
  }

  async start() {
    // CurrencyCore.startWSockets(exchange, ctrl);
    this.exchangeInfo = await this.controller.exchange.exchangeInfo();
    this.startAllTickerStream(this.controller.exchange);
    // this.queueTicker(5000);
  }

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

  getCurrencyFromStream(stream: IStream, fromCur: string, toCur: string) {
    if (!stream || !fromCur || !toCur) {
      return;
    }

    /*
     Binance使用xxxBTC表示法。 如果我们正在考虑xxxBTC，并且我们希望从BTC到xxx，那意味着我们正在购买，反之亦然。
    */
    let currency: ICurrency = Object.assign(<ICurrency>{}, stream.obj[toCur + fromCur]);
    if (currency && Object.keys(currency).length > 0) {
      // found a match using reversed binance syntax,
      // meaning we're buying if we're going from->to (btc->xxx in xxxBTC ticker)
      // using a fromCurtoCur ticker.
      currency.flipped = false;
      currency.rate = +currency.a;

      // BNBBTC
      // ask == trying to buy
    } else {
      currency = Object.assign(<ICurrency>{}, stream.obj[fromCur + toCur]);
      if (!currency || Object.keys(currency).length === 0) {
        return;
      }
      currency.flipped = true;
      currency.rate = 1 / +currency.b;

      // BTCBNB
      // bid == im trying to sell.
    }
    currency.stepFrom = fromCur;
    currency.stepTo = toCur;

    currency.tradeInfo = {
      symbol: currency.s,
      side: currency.flipped === true ? 'SELL' : 'BUY',
      type: 'MARKET',
      quantity: 1,
    };
    // console.log('getCurrencyFromStream: from/to: ', currency.stepFrom, currency.stepTo);

    return currency;
  }

  getArbitageRate(stream: any, step1: string, step2: string, step3: string) {
    if (!stream || !step1 || !step2 || !step3) {
      return;
    }
    const ret = {
      a: this.getCurrencyFromStream(stream, step1, step2),
      b: this.getCurrencyFromStream(stream, step2, step3),
      c: this.getCurrencyFromStream(stream, step3, step1),
      rate: 0,
    };

    if (!ret.a || !ret.b || !ret.c) {
      return;
    }

    ret.rate = ret.a.rate * ret.b.rate * ret.c.rate;
    return ret;
  }

  getCandidatesFromStreamViaPath(stream: IStream, aPair: string, bPair: string) {
    const keys = {
      a: aPair.toUpperCase(),
      b: bPair.toUpperCase(),
      c: 'findme'.toUpperCase(),
    };

    const apairs = stream.markets[keys.a];
    const bpairs = stream.markets[keys.b];

    const akeys: { [attr: string]: any } = {};
    apairs.map((obj: Binance24HrTicker, i: number, array: Binance24HrTicker[]) => {
      akeys[obj.s.replace(keys.a, '')] = obj;
    });

    // 避免 1-steps
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
        // check price from bPairTicker.key to keys.a

        const stepC = this.getCurrencyFromStream(stream, match.key, keys.a);

        // 如果我们确实找到了一条路一些路径是不可能的, 因此将导致一个空的 stepC 报价。
        if (stepC) {
          keys.c = match.key;

          const comparison = this.getArbitageRate(stream, keys.a, keys.b, keys.c);

          if (comparison && comparison.a && comparison.b && comparison.c) {
            // console.log('getCandidatesFromStreamViaPath: from/to a: ', comparison.a.stepFrom, comparison.a.stepTo);
            // console.log('getCandidatesFromStreamViaPath: from/to b: ', comparison.b.stepFrom, comparison.b.stepTo);
            // console.log('getCandidatesFromStreamViaPath: from/to c: ', comparison.c.stepFrom, comparison.c.stepTo);

            const dt = new Date();
            const triangle = {
              ts: +dt,
              dt: dt,
              ws_ts: comparison.a.E,
              // these are for storage later
              a: comparison.a, // full ticker for first pair (BTC->BNB)
              a_symbol: comparison.a.s,
              a_step_from: comparison.a.stepFrom, // btc
              a_step_to: comparison.a.stepTo, // bnb
              a_step_type: comparison.a.tradeInfo.side,
              a_bid_price: comparison.a.b,
              a_bid_quantity: comparison.a.B,
              a_ask_price: comparison.a.a,
              a_ask_quantity: comparison.a.A,
              a_volume: comparison.a.v,
              a_trades: comparison.a.n,

              b: comparison.b, // full ticker for second pair (BNB->XMR)
              b_symbol: comparison.b.s,
              b_step_from: comparison.b.stepFrom, // bnb
              b_step_to: comparison.b.stepTo, // xmr
              b_step_type: comparison.b.tradeInfo.side,
              b_bid_price: comparison.b.b,
              b_bid_quantity: comparison.b.B,
              b_ask_price: comparison.b.a,
              b_ask_quantity: comparison.b.A,
              b_volume: comparison.b.v,
              b_trades: comparison.b.n,
              c: comparison.c, // full ticker for third pair (XMR->BTC)
              c_symbol: comparison.c.s,
              c_step_from: comparison.c.stepFrom, // xmr
              c_step_to: comparison.c.stepTo, // btc
              c_step_type: comparison.c.tradeInfo.side,
              c_bid_price: comparison.c.b,
              c_bid_quantity: comparison.c.B,
              c_ask_price: comparison.c.a,
              c_ask_quantity: comparison.c.A,
              c_volume: comparison.c.v,
              c_trades: comparison.c.n,
              rate: comparison.rate,
            };
            bmatches.push(triangle);

            // console.log('getCandidatesFromStreamViaPath: from/to a: ', triangle.a_step_from, triangle.a_step_to);
            // console.log('getCandidatesFromStreamViaPath: from/to b: ', triangle.b_step_from, triangle.b_step_to);
            // console.log('getCandidatesFromStreamViaPath: from/to c: ', triangle.c_step_from, triangle.c_step_to);
          }
        }
      }
    }

    if (bmatches.length) {
      bmatches.sort((a, b) => {
        return parseFloat(b.rate + '') - parseFloat(a.rate + '');
      });
    }

    return bmatches;
  }

  getDynamicCandidatesFromStream(stream: IStream, options: IArbitrage) {
    let matches: any[] = [];

    for (let i = 0; i < options.paths.length; i++) {
      const pMatches = this.getCandidatesFromStreamViaPath(stream, options.start, options.paths[i]);
      matches = matches.concat(pMatches);
      // console.log("adding: " + pMatches.length + " to : " + matches.length);
    }

    if (matches.length) {
      matches.sort(function(a, b) {
        return parseFloat(b.rate) - parseFloat(a.rate);
      });
    }

    return matches;
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
      bmatches.sort(function(a, b) {
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
}
