const config = require('config');

export class PairRanker {
  // 将每个唯一对存储在一个对象中并跟踪平均排名
  getPairRanking(candidates: any, pairRanks: any, ctrl: any) {
    for (let i = 0; i < candidates.length; i++) {
      const candidate = candidates[i];
      // 创建唯一ID，以便我们可以从数组中过滤它
      const id = candidate['a_step_from'] + candidate['a_step_to'] + candidate['b_step_to'] + candidate['c_step_to'];
      var pair = {
        id,
        step_a: candidate['a_step_from'],
        step_b: candidate['a_step_to'],
        step_c: candidate['b_step_to'],
        step_d: candidate['c_step_to'],
        rate: candidate['rate'],
        date: new Date(),
      };
      pairRanks.push(pair);
    }
    pairRanks = this.cleanPairingArray(pairRanks);

    let check = false;
    let k = -1;
    let returnValue = 'none';
    while (!check && k < 5 && candidates[0].rate > parseFloat(config.minimalProfit)) {
      k++;
      check = this.getTopPairs(candidates[k], pairRanks);
      returnValue = candidates[k];
    }

    ctrl.storage.pairRanks = pairRanks;

    return returnValue;
  }

  // 过滤比X时间旧的数据。
  cleanPairingArray(pairRanks: any) {
    return pairRanks.filter((pair: { [attr: string]: any }) => {
      return pair.date > Date.now() - config.pairTimer;
    });
  }

  // 根据交易对数组，检查顶部候选者
  getTopPairs(pairToCheck: any, pairRanks: any) {
    let check = false;
    const id = pairToCheck['a_step_from'] + pairToCheck['a_step_to'] + pairToCheck['b_step_to'] + pairToCheck['c_step_to'];
    const pairsToCheck = pairRanks.filter((pair: { [attr: string]: any }) => {
      return pair.id == id;
    });
    let rate = 0;
    for (let i = 0; i < pairsToCheck.length; i++) {
      rate += pairsToCheck[i].rate;
    }
    rate = rate / pairsToCheck.length;
    if (rate > parseFloat(config.minimalProfit)) {
      check = true;
    }
    return check;
  }
}
