import * as types from './type';
import { BigNumber } from 'bignumber.js';

export class Rate {
  /**
   * 汇率对象转换（返回可购买数量）
   *
   * @param rateQuote 转换对象
   */
  static convert(rateQuote: types.IRateQuote): BigNumber {
    const bigAmount = new BigNumber(rateQuote.amount);
    if (rateQuote.side === 'buy') {
      return bigAmount.div(rateQuote.exchangeRate);
    }
    return bigAmount.times(rateQuote.exchangeRate);
  }

  /**
   * 换算需使用的数量
   *
   * @param price 价格
   * @param cost 数量*价格=总价
   */
  static convertAmount(price: number, cost: number, side: 'sell' | 'buy') {
    const bigCost = new BigNumber(cost);
    if (side === 'buy') {
      // amount / price = cost
      return bigCost.times(price);
    }
    // amount * price = cost
    return bigCost.div(price);
  }
}
