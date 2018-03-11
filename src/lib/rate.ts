import * as types from './type';
import { BigNumber } from 'bignumber.js';

export class Rate {

  /**
   * 汇率对象转换（返回可购买数量）
   *
   * @param side 买卖方向
   * @param rateQuote 转换对象
   */
  static convert(rateQuote: types.IRateQuote): BigNumber {
    const bigAmount = new BigNumber(rateQuote.amount);
    if (rateQuote.side === 'buy') {
      return bigAmount.div(rateQuote.exchangeRate);
    }
    return bigAmount.times(rateQuote.exchangeRate);
  }
}
