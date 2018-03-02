
import * as PouchDB from 'pouchdb';
import * as types from './type';

export class Storage {
  url = 'ArbitrageDB';
  pouchDB: { [attr: string]: any };

  constructor(url?: string) {
    if (url) {
      this.url = url;
    }
    this.pouchDB = new PouchDB(this.url);
  }

  async putCandidates(candidates: types.ITriangle[]) {
    return await this.pouchDB.bulkDocs(candidates);
  }

  async getCandidates() {
    const candInfo = await this.pouchDB.info();
    if (!candInfo) {
      return;
    }
    return candInfo.doc;
  }

  async removeCandidates() {
    return await this.pouchDB.viewCleanup()
  }
}