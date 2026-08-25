const sqlite3 = require('sqlite3').verbose();
const db = new sqlite3.Database('./database.sqlite');

db.serialize(() => {
  db.all("PRAGMA index_list('approved_students')", (err, rows) => {
    if (err) {
      console.error('INDEXLIST_ERR', err.message);
      db.close();
      return;
    }
    console.log('INDEX_LIST=' + JSON.stringify(rows, null, 2));

    db.all("PRAGMA table_info('approved_students')", (err2, cols) => {
      if (err2) {
        console.error('TABLE_INFO_ERR', err2.message);
        db.close();
        return;
      }
      console.log('TABLE_INFO=' + JSON.stringify(cols, null, 2));
      db.close();
    });
  });
});
