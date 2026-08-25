const sqlite3 = require('sqlite3').verbose();
const db = new sqlite3.Database('database.sqlite');

function query(sql, params = []) {
  return new Promise((resolve, reject) => {
    db.all(sql, params, (err, rows) => {
      if (err) return reject(err);
      resolve(rows);
    });
  });
}

(async () => {
  try {
    const approvedRow = await query('SELECT COUNT(*) AS total FROM approved_students');
    const studentRow = await query('SELECT COUNT(*) AS total FROM students');
    const missing = await query(
      `SELECT a.email, s.email AS studentEmail, s.id, a.firstName, a.lastName
       FROM approved_students a
       LEFT JOIN students s ON LOWER(s.email) = LOWER(a.email)
       WHERE s.email IS NULL
       ORDER BY a.lastName, a.firstName`
    );

    console.log('APPROVED_TOTAL=' + approvedRow[0].total);
    console.log('STUDENT_TOTAL=' + studentRow[0].total);
    console.log('MISSING_STUDENTS=' + missing.length);
    console.log(JSON.stringify(missing.slice(0, 20), null, 2));
  } catch (error) {
    console.error(error);
    process.exitCode = 1;
  } finally {
    db.close();
  }
})();
