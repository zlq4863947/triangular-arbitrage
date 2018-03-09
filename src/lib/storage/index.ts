import * as types from '../type';
import { logger } from '../common';
import { Rank } from './rank';
const config = require('config');

export class Storage {
  url: string = '';
  rank: Rank;

  constructor() {
    if (config.storage.url) {
      this.url = config.storage.url;
    }
    this.rank = new Rank(this.url);
  }
}
