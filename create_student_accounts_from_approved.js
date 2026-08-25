const sqlite3 = require('sqlite3').verbose();
const db = new sqlite3.Database('./database.sqlite');

function getApprovedStudents() {
  return new Promise((resolve, reject) => {
    db.all('SELECT * FROM approved_students ORDER BY id ASC', (err, rows) => {
      if (err) return reject(err);
      resolve(rows || []);
    });
  });
}

function getStudentByEmail(email) {
  return new Promise((resolve, reject) => {
    db.get('SELECT * FROM students WHERE LOWER(email) = LOWER(?)', [email], (err, row) => {
      if (err) return reject(err);
      resolve(row || null);
    });
  });
}

function insertStudent(student) {
  return new Promise((resolve, reject) => {
    db.run(
      'INSERT INTO students (firstName, lastName, email, indexNumber, level, programme, department, hasVoted) VALUES (?, ?, ?, ?, ?, ?, ?, 0)',
      [
        student.firstName || 'Approved',
        student.lastName || 'Student',
        student.email,
        student.indexNumber || '400',
        student.level || '400',
        student.programme || 'GENERAL',
        'Not set'
      ],
      function (err) {
        if (err) return reject(err);
        resolve({ id: this.lastID, changes: this.changes });
      }
    );
  });
}

function updateStudent(student) {
  return new Promise((resolve, reject) => {
    db.run(
      'UPDATE students SET firstName = ?, lastName = ?, indexNumber = ?, level = ?, programme = ? WHERE LOWER(email) = LOWER(?)',
      [
        student.firstName || 'Approved',
        student.lastName || 'Student',
        student.indexNumber || '400',
        student.level || '400',
        student.programme || 'GENERAL',
        student.email
      ],
      function (err) {
        if (err) return reject(err);
        resolve({ changes: this.changes });
      }
    );
  });
}

async function main() {
  const approved = await getApprovedStudents();
  let created = 0;
  let updated = 0;

  for (const student of approved) {
    const email = String(student.email || '').trim();
    if (!email) continue;

    const existing = await getStudentByEmail(email);
    if (!existing) {
      await insertStudent(student);
      created += 1;
    } else {
      await updateStudent(student);
      updated += 1;
    }
  }

  const totalRows = await new Promise((resolve, reject) => {
    db.get('SELECT COUNT(*) AS total FROM students', (err, row) => err ? reject(err) : resolve(row.total));
  });

  console.log('approved_count=' + approved.length);
  console.log('student_rows_after=' + totalRows);
  console.log('created=' + created);
  console.log('updated=' + updated);

  const sample = approved[0];
  if (sample && sample.email) {
    const loginResponse = await fetch('http://localhost:3000/api/student/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: sample.email,
        firstName: sample.firstName,
        lastName: sample.lastName
      })
    });
    const loginData = await loginResponse.json();
    console.log('login_check=' + JSON.stringify({ status: loginResponse.status, body: loginData }));
  }

  db.close();
}

main().catch((error) => {
  console.error('SYNC_ERROR', error && error.stack ? error.stack : String(error));
  db.close();
  process.exit(1);
});
