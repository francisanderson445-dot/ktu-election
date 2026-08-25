const sqlite3 = require('sqlite3').verbose();
const db = new sqlite3.Database('./database.sqlite');

async function getRow(sql, params = []) {
  return new Promise((resolve, reject) => {
    db.get(sql, params, (err, row) => err ? reject(err) : resolve(row));
  });
}

async function run(sql, params = []) {
  return new Promise((resolve, reject) => {
    db.run(sql, params, function (err) {
      if (err) return reject(err);
      resolve({ id: this.lastID, changes: this.changes });
    });
  });
}

async function main() {
  try {
    const indexRows = await new Promise((resolve, reject) => {
      db.all("PRAGMA index_list('approved_students')", (err, rows) => err ? reject(err) : resolve(rows));
    });
    console.log('index_list', JSON.stringify(indexRows));

    const sample = await getRow('SELECT id, email, firstName, lastName FROM approved_students ORDER BY id LIMIT 1');
    console.log('sample_approved', JSON.stringify(sample));

    const adminLogin = await fetch('http://localhost:3000/api/admin/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username: 'admin', password: 'admin123' })
    });
    const adminData = await adminLogin.json();
    console.log('admin_login', JSON.stringify(adminData));

    const bulkPayload = {
      students: [{
        firstName: 'Test',
        lastName: 'Student',
        email: 'teststudent@example.com',
        level: '400',
        programme: 'BTECH'
      }]
    };

    const bulkResponse = await fetch('http://localhost:3000/api/admin/approved-students/bulk', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${adminData.token}`
      },
      body: JSON.stringify(bulkPayload)
    });
    const bulkData = await bulkResponse.json();
    console.log('bulk_import', JSON.stringify(bulkData));

    const existingStudent = await getRow('SELECT * FROM students WHERE LOWER(email) = LOWER(?)', [sample.email]);
    if (!existingStudent) {
      await run(
        'INSERT INTO students (firstName, lastName, email, indexNumber, level, programme, department, hasVoted) VALUES (?, ?, ?, ?, ?, ?, ?, 0)',
        [sample.firstName || 'Approved', sample.lastName || 'Student', sample.email, '400', '400', 'GENERAL', 'ICT']
      );
    }

    const studentLogin = await fetch('http://localhost:3000/api/student/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: sample.email, firstName: sample.firstName, lastName: sample.lastName })
    });
    const studentData = await studentLogin.json();
    console.log('student_login', JSON.stringify(studentData));
  } catch (error) {
    console.error('VALIDATION_ERROR', error && error.stack ? error.stack : String(error));
    process.exitCode = 1;
  } finally {
    db.close();
  }
}

main();
