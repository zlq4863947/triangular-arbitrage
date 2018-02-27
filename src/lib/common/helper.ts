import * as types from '../type';

const ccxt = require('ccxt');
const config = require('config');

export class Helper {
  static getPrivateKey(exchangeId: types.ExchangeId) {
    if (config.account[exchangeId] && config.account[exchangeId].apiKey && config.account[exchangeId].secret) {
      return <types.ICredentials>{
        apiKey: config[exchangeId].account.apiKey,
        secret: config[exchangeId].account.secret,
      };
    }
  }

  static getExchangeApi(exchange: types.ExchangeId): types.IExchangeApi | undefined {
    const privateKey = Helper.getPrivateKey(exchange);
    switch (exchange) {
      case types.ExchangeId.KuCoin:
      case types.ExchangeId.Binance:
        if (privateKey) {
          return {
            id: exchange,
            type: 'private',
            endpoint: new ccxt[exchange](privateKey),
          };
        }
        return {
          id: exchange,
          type: 'public',
          endpoint: new ccxt[exchange](),
        };
      case types.ExchangeId.Bitbank:
      // todo
    }
  }
}
