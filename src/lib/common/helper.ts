import * as types from '../type';

const ccxt = require('ccxt');
const config = require('config');

export class Helper {
  static getPrivateKey(exchangeId: types.ExchangeId) {
    if (config.account[exchangeId] && config.account[exchangeId].apiKey && config.account[exchangeId].secret) {
      return <types.ICredentials>{
        apiKey: config.account[exchangeId].apiKey,
        secret: config.account[exchangeId].secret,
      };
    }
  }

  static getExchange(exchange: types.ExchangeId): types.IExchange | undefined {
    const privateKey = Helper.getPrivateKey(exchange);
    switch (exchange) {
      case types.ExchangeId.KuCoin:
      case types.ExchangeId.Binance:
        if (privateKey) {
          return {
            id: exchange,
            endpoint: {
              private: new ccxt[exchange](privateKey),
            },
          };
        }
        return {
          id: exchange,
          endpoint: {
            public: new ccxt[exchange](privateKey),
          },
        };
      case types.ExchangeId.Bitbank:
      // todo
    }
  }
}
