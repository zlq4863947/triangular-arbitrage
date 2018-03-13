import * as types from '../type';
import { logger } from '../common';
import { Rank } from './rank';
import { Trade } from './trade';
import { Queue } from './queue';
const config = require('config');

export class Storage {
  url = '';
  rank: Rank;
  trade: Trade;
  queue: Queue;

  constructor() {
    if (config.storage.url) {
      this.url = config.storage.url;
    }
    this.rank = new Rank(this.url);
    this.trade = new Trade(this.url);
    this.queue = new Queue(this.url);
  }
}
