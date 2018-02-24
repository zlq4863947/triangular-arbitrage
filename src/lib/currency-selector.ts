export class CurrencySelector {
  selectorRaw: any;
  splitSelector: any;
  key: any;
  asset: any;
  interval: any;
  exchangeAPI: any;
  events: any;
  trades: any;
  orderBook: any;
  sockets: any;
  handleEvent: any;
  selector: any;

  constructor(selectorRaw: any, exchangeAPI: any) {
    /* Currency selector stuff */
    this.selectorRaw = selectorRaw; //XRP-ETH
    this.splitSelector = this.selectorRaw.split('-'); //XRP, ETH array
    this.key = this.splitSelector.join(''); //XRPETH
    this.asset = this.splitSelector[0]; //XRP
    this.selector = this.splitSelector[1]; //ETH

    // sockets stuff
    this.interval = '30s';
    this.exchangeAPI = exchangeAPI;

    // placeholders
    this.events = {};
    this.trades = {};
    this.orderBook = {};
    this.sockets = {};
    this.handleEvent = () => {};
  }
}
