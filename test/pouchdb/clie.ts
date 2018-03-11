import * as PouchDB from 'pouchdb';
import { Storage } from '../../src/lib/storage';

const storage = new Storage();

(async () => {
  storage.rank.onChanged(async (change: any) => {
    const docs = await storage.rank.allDocs({
      include_docs: true,
      attachments: true,
    });
    console.log('to change: ', JSON.stringify(docs, null, 2));
  });
})();
