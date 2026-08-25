const fs = require('fs');
const path = require('path');
const sqlite3 = require('sqlite3').verbose();

const db = new sqlite3.Database(path.join(__dirname, 'database.sqlite'));

function normalizeText(value) {
  return String(value ?? '').trim().replace(/\s+/g, ' ');
}

function parseListFile(filePath) {
  const text = fs.readFileSync(filePath, 'utf8');
  const entries = [];
  const lines = text.split(/\r?\n/);

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('---')) continue;

    const match = trimmed.match(/^(.*?),\s*([A-Za-z0-9._%+\-]+@[A-Za-z0-9.\-]+\.[A-Za-z]{2,})\s*$/i);
    const altMatch = trimmed.match(/^(.+?)\s+([A-Za-z0-9._%+\-]+@[A-Za-z0-9.\-]+\.[A-Za-z]{2,})\s*$/i);
    const emailMatch = trimmed.match(/[A-Za-z0-9._%+\-]+@[A-Za-z0-9.\-]+\.[A-Za-z]{2,}/i);

    const email = (emailMatch && emailMatch[0]) ? emailMatch[0].trim().toLowerCase() : '';
    if (!email) continue;

    let namePart = '';
    if (match) {
      namePart = match[1];
    } else if (altMatch) {
      namePart = altMatch[1];
    } else {
      namePart = trimmed.replace(email, '').trim();
    }

    namePart = namePart.replace(/[|,;]+/g, ' ').replace(/\s+/g, ' ').trim();
    const nameTokens = namePart.split(/\s+/).filter(Boolean);
    const firstName = nameTokens[0] || 'Student';
    const lastName = nameTokens.slice(1).join(' ') || 'Approved';

    entries.push({
      firstName,
      lastName,
      email,
      indexNumber: '400',
      level: '400',
      programme: 'GENERAL'
    });
  }

  return entries;
}

function getAllEmails() {
  return new Promise((resolve, reject) => {
    db.all('SELECT LOWER(email) AS email FROM approved_students', (err, rows) => {
      if (err) return reject(err);
      resolve(new Set((rows || []).map((row) => String(row.email).toLowerCase())));
    });
  });
}

async function main() {
  const filePath = path.join(__dirname, 'approved_students.txt');
  const sourceEntries = parseListFile(filePath);
  const existingEmails = await getAllEmails();

  const missing = sourceEntries.filter((entry) => !existingEmails.has(entry.email.toLowerCase()));
  const unique = [];
  const seen = new Set();
  for (const item of missing) {
    const key = item.email.toLowerCase();
    if (!seen.has(key)) {
      seen.add(key);
      unique.push(item);
    }
  }

  console.log('source_entries', sourceEntries.length);
  console.log('existing_db_emails', existingEmails.size);
  console.log('missing_unique', unique.length);
  console.log('missing_emails', unique.map((item) => item.email).join(', '));

  for (const item of unique) {
    await new Promise((resolve, reject) => {
      db.run(
        'INSERT OR IGNORE INTO approved_students (firstName, lastName, email, indexNumber, level, programme, sourceFile) VALUES (?, ?, ?, ?, ?, ?, ?)',
        [item.firstName, item.lastName, item.email, item.indexNumber, item.level, item.programme, 'approved_students.txt'],
        (err) => err ? reject(err) : resolve()
      );
    });
  }

  const total = await new Promise((resolve, reject) => {
    db.get('SELECT COUNT(*) AS total FROM approved_students', (err, row) => err ? reject(err) : resolve(row.total));
  });
  console.log('final_total', total);
  db.close();
}

main().catch((error) => {
  console.error(error);
  db.close();
  process.exitCode = 1;
});
