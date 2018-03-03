import * as PouchDB from 'pouchdb';
import { Storage } from '../../src/lib/storage';

const storage = new Storage();

(async () => {
  storage.onChanged(async (change: any) => {
    const docs = await storage.pouchDB.allDocs({
      include_docs: true,
      attachments: true
    });
    console.log('to change: ', JSON.stringify(docs, null, 2));
  });
})();