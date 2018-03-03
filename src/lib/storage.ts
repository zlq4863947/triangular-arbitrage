
import * as PouchDB from 'pouchdb';
import * as types from './type';
import { logger } from './common';
const config = require('config');

export class Storage {
  id = 'storage';
  url: string;
  pouchDB: { [attr: string]: any };

  constructor() {
    this.url = this.id;
    if (config.storage.url) {
      this.url = config.storage.url + '/' + this.id;
    }
    this.pouchDB = new PouchDB(this.url);
  }

  async putRanks(ranks: types.IRank[]) {

    try {
      const docs = await this.pouchDB.allDocs({
        include_docs: true,
        attachments: true
      });
      if (docs.rows.length > config.display.maxRows) {
        // 超过最大显示数时，清空数据库
        await this.removeAllDocs();
      }

      for (let [i, row] of ranks.entries()) {
        if (docs.rows[i]) {
          ranks[i] = Object.assign({}, docs.rows[i].doc, row)
        }
      }
      return await this.pouchDB.bulkDocs(ranks);
    } catch (err) {
      logger.error(`存储排行数据出错: ${err}`);
    }
  }
  /**
   * 存储数据
   * @param rows
   */
  async put(rows: { [attr: string]: any }[]) {
    try {
      const docs = await this.pouchDB.allDocs({
        include_docs: true,
        attachments: true
      });
      for (let [i, row] of rows.entries()) {
        if (docs.rows[i]) {
          rows[i] = Object.assign({}, docs.rows[i].doc, row)
        }
      }
      return await this.pouchDB.bulkDocs(rows);
    } catch (err) {
      logger.error(`存储数据出错: ${err}`);
    }
  }

  async getAllDocs() {
    try {
      const docsInfo = await this.pouchDB.allDocs({
        include_docs: true,
        attachments: true
      });
      const docs: any[] = [];
      if (docsInfo && docsInfo.rows && docsInfo.rows.length > 0) {
        const rows: any[] = docsInfo.rows;
        rows.reduce((pre, row) => {
          if (row && row.doc) {
            docs.push(row.doc);
          }
        }, <any>{});
      }
      return docs;
    } catch (err) {
      logger.error(`获取数据出错: ${err}`);
    }
  }

  async removeAllDocs() {
    try {

      const docsInfo = await this.pouchDB.allDocs({
        include_docs: true,
        attachments: true
      });
      if (docsInfo && docsInfo.rows && docsInfo.rows.length > 0) {
        const docs: any[] = [];
        if (docsInfo && docsInfo.rows && docsInfo.rows.length > 0) {
          const rows: any[] = docsInfo.rows;
          rows.reduce((pre, row) => {
            if (row && row.doc) {
              row.doc._deleted = true;
              docs.push(row.doc);
            }
          }, <any>{});
        }
        return await this.pouchDB.bulkDocs(docs);
      }
    } catch (err) {
      logger.error(`删除数据出错: ${err}`);
    }
  }

  async viewCleanup() {
    return await this.pouchDB.viewCleanup()
  }

  onChanged(fn: (change: any) => {}) {
    this.pouchDB.changes({
      live: true,
      include_docs: true
    }).on('change', fn);
  }
}