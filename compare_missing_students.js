const fs = require('fs');
const path = require('path');
const sqlite3 = require('sqlite3').verbose();

const db = new sqlite3.Database(path.join(__dirname, 'database.sqlite'));

function parseSourceList(filePath) {
  const text = fs.readFileSync(filePath, 'utf8');
  const entries = [];
  const seen = new Set();

  for (const rawLine of text.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line) continue;
    if (line.startsWith('---')) continue;

    const emailMatch = line.match(/[A-Za-z0-9._%+\-]+@[A-Za-z0-9.\-]+\.[A-Za-z]{2,}/i);
    if (!emailMatch) continue;

    const email = emailMatch[0].trim().toLowerCase();
    const namePart = line.replace(email, '').replace(/[|,;]+/g, ' ').replace(/\s+/g, ' ').trim();
    const tokens = namePart.split(/\s+/).filter(Boolean);
    const firstName = tokens[0] || 'Student';
    const lastName = tokens.slice(1).join(' ') || 'Approved';
    const key = `${firstName.toLowerCase()}|${lastName.toLowerCase()}|${email}`;

    if (!seen.has(key)) {
      seen.add(key);
      entries.push({ firstName, lastName, email });
    }
  }

  return entries;
}

function getApprovedEmails() {
  return new Promise((resolve, reject) => {
    db.all('SELECT LOWER(email) AS email FROM approved_students', (err, rows) => {
      if (err) return reject(err);
      const set = new Set((rows || []).map((row) => String(row.email).toLowerCase()));
      resolve(set);
    });
  });
}

(async function main() {
  const sourceEntries = parseSourceList(path.join(__dirname, 'approved_students.txt'));
  const approvedEmails = await getApprovedEmails();

  const missing = sourceEntries.filter((student) => !approvedEmails.has(student.email));
  console.log('source_total=' + sourceEntries.length);
  console.log('approved_total=' + approvedEmails.size);
  console.log('missing_total=' + missing.length);
  console.log(JSON.stringify(missing, null, 2));
  db.close();
})().catch((error) => {
  console.error(error);
  db.close();
  process.exit(1);
});
