const sqlite3 = require('sqlite3').verbose();
const db = new sqlite3.Database('./database.sqlite');

db.serialize(() => {
  db.all("PRAGMA index_list('approved_students')", (err, rows) => {
    if (err) {
      console.error('INDEX_LIST_ERR', err.message);
      db.close();
      return;
    }
    console.log('INDEX_LIST=' + JSON.stringify(rows, null, 2));
    rows.forEach((row) => {
      db.all(`PRAGMA index_info('${row.name}')`, (err2, info) => {
        if (err2) {
          console.error('INDEX_INFO_ERR', row.name, err2.message);
          return;
        }
        console.log(`INDEX_INFO:${row.name}=` + JSON.stringify(info, null, 2));
      });
    });
    setTimeout(() => db.close(), 500);
  });
});
