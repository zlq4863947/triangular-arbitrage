import * as PouchDB from 'pouchdb';
import { Storage } from '../../src/lib/storage';

const storage = new Storage();
let z_index = 0;

setInterval(async () => {
  try {
    z_index++;
    const rows = [{ z_index, title: 'Lisa Says' }, { z_index, title: 'Space Oddity' }, { z_index, title: '23tl' }];
    const docs = await storage.rank.allDocs({
      include_docs: true,
      attachments: true,
    });
    for (let [i, row] of rows.entries()) {
      if (docs.rows[i]) {
        rows[i] = Object.assign({}, docs.rows[i].doc, row);
      }
    }
    const res = await storage.rank.bulkDocs(rows);
    console.log(z_index, res);
  } catch (err) {
    console.error(err);
  }
}, 3000);
