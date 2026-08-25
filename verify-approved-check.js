const sqlite3 = require('sqlite3').verbose();

const db = new sqlite3.Database('./database.sqlite');
const samples = [
  'manmaraste444@gmail.com',
  'sassahesther993@gmail.com',
  'odeibeabridget3@gmail.com',
  'amponsahflora40@gmail.com',
  'doreenawunor024@gmail.com',
  'deborahb502250037@ktu.edu.gh'
];

let checked = 0;
for (const email of samples) {
  db.get('SELECT id, email FROM approved_students WHERE LOWER(email) = LOWER(?)', [email], (err, row) => {
    if (err) {
      console.error('VERIFY_ERR', err.message);
      db.close();
      process.exit(1);
    }
    console.log(email + ' => ' + (row ? 'FOUND' : 'NOT_FOUND'));
    checked += 1;
    if (checked === samples.length) {
      db.get('SELECT COUNT(*) AS total FROM approved_students', (countErr, countRow) => {
        if (countErr) {
          console.error('COUNT_ERR', countErr.message);
          db.close();
          process.exit(1);
        }
        console.log('APPROVED_COUNT=' + (countRow ? countRow.total : 0));
        db.close();
      });
    }
  });
}
