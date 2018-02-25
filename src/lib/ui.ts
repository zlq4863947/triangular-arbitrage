import { EventEmitter } from 'events';

const config = require('config');

export class UI {
  socket: EventEmitter;
  options: any;
  maxRows: number;

  constructor(options: any) {
    this.options = options;
    this.socket = options.socket;
    this.maxRows = config.maxRows;
  }

  updateArbitageOpportunities(tickers: any[]) {
    if (!tickers) {
      return;
    }
    const updTickers = [];
    for (let i = 0; i < this.maxRows; i++) {
      const ticker = tickers[i];
      if (!ticker) return;
      if (ticker.a) {
        ticker.n_rate = (ticker.rate - 1) * 100;
        ticker.n_fees1 = ticker.n_rate * 0.05; //bnb
        ticker.n_fRate1 = ticker.n_rate - ticker.n_fees1;

        ticker.n_fees2 = ticker.n_rate * 0.1; //other
        ticker.n_fRate2 = ticker.n_rate - ticker.n_fees2;
        updTickers.push(ticker);
      }
    }

    if (updTickers.length > 0) {
      this.socket.emit('updateArbitage', updTickers);
    }
  }

  updateTickers(tickers: any[]) {
    /*
    if (!this.outputBuffer || !tickers){
      return;
    }
    
    
    var keys = Object.keys(tickers).sort();
    if (this.outputBuffer.lines.length >= keys.length) this.outputBuffer.lines.splice(3, keys.length);    
    
    //this.maxRows = keys.length + 2;
    
    for (let i=0;i<keys.length;i++){
      const ticker = tickers[keys[i]];
      if (!ticker) return;
      
      
          
    } 
    this.outputBuffer.output();*/
  }
}
