
import * as PouchDB from 'pouchdb';
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
      logger.error(`数据库放入候选者出错: ${err}`);
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
      logger.error(`数据库获取候选者出错: ${err}`);
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