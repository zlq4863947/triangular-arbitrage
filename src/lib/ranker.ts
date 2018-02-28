import * as types from './type';
import { BigNumber } from 'BigNumber.js';

const config = require('config');

export class Ranker {
  getCandidateId(candidate: any) {
    return candidate['a_step_from'] + '_' + candidate['a_step_to'] + '_' + candidate['b_step_to'] + '_' + candidate['c_step_to'];
  }
}
