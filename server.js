const express = require('express');
const cors = require('cors');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const postgres = require('postgres');
const fs = require('fs');
const path = require('path');
let XLSX;
try {
  XLSX = require('xlsx');
} catch (error) {
  XLSX = null;
}

const app = express();
const PORT = process.env.PORT || 3000;
const JWT_SECRET = process.env.JWT_SECRET || 'ktu-portfolio-voting-secret';
const DB_PATH = process.env.DB_PATH || path.join(__dirname, 'database.sqlite');
const DATABASE_URL = process.env.DATABASE_URL || '';
const ADMIN_USERNAME = process.env.ADMIN_USERNAME || 'admin';
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'admin123';
const MAX_VOTERS = 400;
const VALID_PORTFOLIOS = [
  'President',
  'General Secretary',
  'Public Relations Officer',
  'Financial Officer',
  'Organizer',
  'Women Commissioner'
];

if (!DATABASE_URL) fs.mkdirSync(path.dirname(DB_PATH), { recursive: true });

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use(cors());
app.use(express.static(__dirname));

const db = DATABASE_URL ? postgres(DATABASE_URL, {
  max: 1,
  prepare: false,
  ssl: 'require',
  connect_timeout: 30
}) : null;
const sqlite = !DATABASE_URL ? new (require('sqlite3').verbose()).Database(DB_PATH) : null;
if (DATABASE_URL) console.log('Connected to Supabase PostgreSQL');

function convertSql(sql) {
  let parameterIndex = 0;
  let convertedSql = sql
    .replace(/INTEGER PRIMARY KEY AUTOINCREMENT/gi, 'BIGSERIAL PRIMARY KEY')
    .replace(/INSERT OR IGNORE INTO/gi, 'INSERT INTO')
    .replace(/\?/g, () => `$${++parameterIndex}`);

  if (/^INSERT INTO approved_students/i.test(convertedSql)) {
    convertedSql += ' ON CONFLICT (email) DO NOTHING';
  }

  return convertedSql;
}

function sqliteRun(sql, params) {
  return new Promise((resolve, reject) => {
    sqlite.run(sql, params, function (error) {
      if (error) return reject(error);
      resolve({ id: this.lastID, changes: this.changes });
    });
  });
}

async function run(sql, params = []) {
  if (!DATABASE_URL) return sqliteRun(sql, params);
  const result = await db.unsafe(convertSql(sql), params);
  return { id: result[0]?.id, changes: result.count ?? result.length };
}

async function all(sql, params = []) {
  if (!DATABASE_URL) {
    return new Promise((resolve, reject) => sqlite.all(sql, params, (error, rows) => error ? reject(error) : resolve(rows)));
  }
  if (/^PRAGMA /i.test(sql)) return [];
  const rows = await db.unsafe(convertSql(sql), params);
  return rows.map(normalizeDatabaseRow);
}

async function get(sql, params = []) {
  const rows = await all(sql, params);
  return rows[0];
}

function normalizeDatabaseRow(row) {
  if (!DATABASE_URL || !row) return row;

  const fieldNames = {
    fullname: 'fullName',
    firstname: 'firstName',
    lastname: 'lastName',
    indexnumber: 'indexNumber',
    hasvoted: 'hasVoted',
    createdat: 'createdAt',
    photourl: 'photoUrl',
    votecount: 'voteCount',
    submittedat: 'submittedAt',
    studentid: 'studentId',
    nomineeid: 'nomineeId',
    nomineename: 'nomineeName',
    votechoice: 'voteChoice',
    yesvotes: 'yesVotes',
    novotes: 'noVotes',
    sourcefile: 'sourceFile'
  };

  return Object.fromEntries(Object.entries(row).map(([key, value]) => [fieldNames[key] || key, value]));
}

function limitPublicPhotoSize(nominee) {
  if (nominee.photoUrl && nominee.photoUrl.length > 700000) {
    return { ...nominee, photoUrl: null };
  }
  return nominee;
}

async function insertApprovedStudents(students) {
  if (!students.length) return;

  if (DATABASE_URL) {
    const values = [];
    const placeholders = students.map((student, index) => {
      const offset = index * 7;
      values.push(student.firstName, student.lastName, student.email, student.indexNumber, student.level, student.programme, student.sourceFile);
      return `($${offset + 1}, $${offset + 2}, $${offset + 3}, $${offset + 4}, $${offset + 5}, $${offset + 6}, $${offset + 7})`;
    }).join(', ');

    await db.unsafe(
      `INSERT INTO approved_students (firstName, lastName, email, indexNumber, level, programme, sourceFile) VALUES ${placeholders} ON CONFLICT (email) DO NOTHING`,
      values
    );
    return;
  }

  for (const student of students) {
    await run(
      'INSERT INTO approved_students (firstName, lastName, email, indexNumber, level, programme, sourceFile) VALUES (?, ?, ?, ?, ?, ?, ?)',
      [student.firstName, student.lastName, student.email, student.indexNumber, student.level, student.programme, student.sourceFile]
    );
  }
}

function normalizeText(value) {
  return String(value ?? '').trim().replace(/\s+/g, ' ');
}

function normalizeKey(value) {
  return normalizeText(value).toLowerCase();
}

function resolvePortfolio(value) {
  const normalized = normalizeText(value || '').toLowerCase();
  const matched = VALID_PORTFOLIOS.find((portfolio) => portfolio.toLowerCase() === normalized);

  if (!matched) {
    throw new Error(`Invalid portfolio. Allowed values: ${VALID_PORTFOLIOS.join(', ')}`);
  }

  return matched;
}

function getClassListFolderCandidates() {
  const desktopPath = process.env.USERPROFILE ? path.join(process.env.USERPROFILE, 'Desktop') : path.join('C:', 'Users', 'hp', 'Desktop');
  return [
    path.join(__dirname, 'class list'),
    path.join(desktopPath, 'class list'),
    path.join('C:', 'Users', 'hp', 'Desktop', 'class list')
  ];
}

function getClassListFolder() {
  return getClassListFolderCandidates().find((folderPath) => fs.existsSync(folderPath));
}

function findHeaderValue(row, aliases) {
  for (const [key, value] of Object.entries(row || {})) {
    if (aliases.includes(normalizeKey(String(key)))) {
      return value;
    }
  }
  return '';
}

function extractApprovedStudentsFromRows(rows, fallbackProgramme = 'BTECH', fallbackLevel = '400') {
  const approved = [];
  for (const row of rows) {
    if (!row || typeof row !== 'object') continue;

    const email = normalizeText(findHeaderValue(row, ['email', 'studentemail', 'student email', 'personalemail', 'personal email', 'emailaddress', 'email address']));
    const rawLevelValue = normalizeText(findHeaderValue(row, ['level', 'studentlevel', 'year', 'class', 'semester', 'classlevel']));
    const programmeValue = normalizeText(findHeaderValue(row, ['programme', 'program', 'department', 'departmentname', 'course', 'courseprogram']));
    const firstName = normalizeText(findHeaderValue(row, ['firstname', 'first name', 'fname', 'givenname', 'given name']));
    const lastName = normalizeText(findHeaderValue(row, ['lastname', 'last name', 'surname', 'familyname', 'family name', 'lname']));

    if (!email) continue;

    const fullName = normalizeText(String(row.fullName || row.name || row.studentName || '')).replace(/\s+/g, ' ');
    const resolvedFirstName = firstName || fullName.split(' ')[0] || '';
    const resolvedLastName = lastName || fullName.split(' ').slice(1).join(' ') || '';
    const level = (rawLevelValue || fallbackLevel).replace(/[^0-9]/g, '') || fallbackLevel;
    const programme = (programmeValue || fallbackProgramme).toUpperCase();
    const indexNumber = level;

    approved.push({
      firstName: resolvedFirstName,
      lastName: resolvedLastName,
      email,
      indexNumber,
      level: level || '400',
      programme
    });
  }

  return approved.filter((student) => student.email && student.level);
}

function parseClassListMeta(filePath) {
  const baseName = path.basename(filePath).toLowerCase();
  const programme = /btech/.test(baseName) ? 'BTECH' : /hnd/.test(baseName) ? 'HND' : 'BTECH';
  const match = baseName.match(/(100|200|300|400)/);
  const level = match ? match[1] : '400';
  return { programme, level };
}

function parseBulkApprovedStudentsInput(rawInput) {
  const text = String(rawInput ?? '').trim();
  if (!text) return [];

  const lines = text
    .split(/\r?\n/)
    .map((line) => line.replace(/^[-*•\d.\s]+/, '').trim())
    .filter(Boolean);

  const results = [];

  for (const line of lines) {
    const emailMatch = line.match(/[A-Za-z0-9._%+\-]+@[A-Za-z0-9.\-]+\.[A-Za-z]{2,}/);
    const email = emailMatch ? emailMatch[0].trim().toLowerCase() : '';
    if (!email) continue;

    const namePart = line.replace(email, '').replace(/[|,;]+/g, ' ').trim();
    const nameTokens = namePart.split(/\s+/).filter(Boolean);
    const firstName = nameTokens[0] || 'Student';
    const lastName = nameTokens.slice(1).join(' ') || 'Approved';

    results.push({
      firstName,
      lastName,
      email,
      indexNumber: '400',
      level: '400',
      programme: 'GENERAL'
    });
  }

  return results;
}

function loadApprovedStudentsFromTextFile() {
  const listFilePath = path.join(__dirname, 'approved_students.txt');
  if (!fs.existsSync(listFilePath)) {
    return [];
  }

  const rawText = fs.readFileSync(listFilePath, 'utf8');
  const emailRegex = /[A-Za-z0-9._%+\-]+@[A-Za-z0-9.\-]+\.[A-Za-z]{2,}/g;
  const emails = [...new Set([...rawText.matchAll(emailRegex)].map((match) => normalizeText(match[0]).toLowerCase()))].filter(Boolean);

  return emails.map((email) => {
    const localPart = email.split('@')[0].replace(/[^a-zA-Z]/g, ' ').trim();
    const parts = localPart.split(/\s+/).filter(Boolean);
    const firstName = parts[0] || 'Student';
    const lastName = parts.slice(1).join(' ') || 'Approved';

    return {
      firstName,
      lastName,
      email,
      indexNumber: '400',
      level: '400',
      programme: 'GENERAL',
      sourceFile: 'approved_students.txt'
    };
  });
}

async function syncApprovedStudentsFromClassList() {
  if (DATABASE_URL) {
    console.log('Skipping desktop class-list synchronization in Supabase mode.');
    return;
  }
  const folderPath = getClassListFolder();
  if (!folderPath) {
    console.log('No class list folder found on desktop. Trying the local approved-student fallback list.');
    const fallbackStudents = loadApprovedStudentsFromTextFile();
    if (!fallbackStudents.length) {
      return;
    }

    await run('CREATE TABLE IF NOT EXISTS approved_students (id INTEGER PRIMARY KEY AUTOINCREMENT, firstName TEXT, lastName TEXT, email TEXT UNIQUE NOT NULL, indexNumber TEXT, level TEXT DEFAULT "400", programme TEXT DEFAULT "BTECH", sourceFile TEXT)');
    await run('DELETE FROM approved_students');

    for (const student of fallbackStudents) {
      await run(
        'INSERT INTO approved_students (firstName, lastName, email, indexNumber, level, programme, sourceFile) VALUES (?, ?, ?, ?, ?, ?, ?)',
        [student.firstName, student.lastName, student.email, student.indexNumber, student.level, student.programme, student.sourceFile]
      );
    }

    console.log(`Loaded ${fallbackStudents.length} approved students from the local approved list.`);
    return;
  }

  if (!XLSX) {
    console.log('xlsx package is not installed yet. Please run: npm install xlsx');
    return;
  }

  const files = fs.readdirSync(folderPath)
    .filter((file) => /\.(xlsx|xls|csv)$/i.test(file))
    .map((file) => path.join(folderPath, file));

  if (!files.length) {
    console.log('No class list files found in the desktop folder.');
    return;
  }

  const approvedStudents = [];

  for (const filePath of files) {
    try {
      const fileMeta = parseClassListMeta(filePath);
      const workbook = XLSX.readFile(filePath);
      for (const sheetName of workbook.SheetNames) {
        const rows = XLSX.utils.sheet_to_json(workbook.Sheets[sheetName], { defval: '', raw: false });
        approvedStudents.push(...extractApprovedStudentsFromRows(rows, fileMeta.programme, fileMeta.level));
      }
    } catch (error) {
      console.error('Unable to read class list file:', filePath, error.message);
    }
  }

  const uniqueApprovedStudents = [];
  const seen = new Set();

  for (const student of approvedStudents) {
    const key = student.email.toLowerCase();
    if (!seen.has(key)) {
      seen.add(key);
      uniqueApprovedStudents.push(student);
    }
  }

  await run('CREATE TABLE IF NOT EXISTS approved_students (id INTEGER PRIMARY KEY AUTOINCREMENT, firstName TEXT, lastName TEXT, email TEXT UNIQUE NOT NULL, indexNumber TEXT, level TEXT DEFAULT "400", programme TEXT DEFAULT "BTECH", sourceFile TEXT)');
  await run('DELETE FROM approved_students');

  for (const student of uniqueApprovedStudents) {
    await run(
      'INSERT INTO approved_students (firstName, lastName, email, indexNumber, level, programme, sourceFile) VALUES (?, ?, ?, ?, ?, ?, ?)',
      [student.firstName, student.lastName, student.email, student.indexNumber, student.level, student.programme || 'BTECH', folderPath]
    );
  }

  const totalCurrent = await get('SELECT COUNT(*) AS total FROM approved_students');
  if ((totalCurrent?.total || 0) === 0) {
    const fallbackStudents = loadApprovedStudentsFromTextFile();
    for (const student of fallbackStudents) {
      await run(
        'INSERT INTO approved_students (firstName, lastName, email, indexNumber, level, programme, sourceFile) VALUES (?, ?, ?, ?, ?, ?, ?)',
        [student.firstName, student.lastName, student.email, student.indexNumber, student.level, student.programme, student.sourceFile]
      );
    }
  }

  console.log(`Loaded ${uniqueApprovedStudents.length} eligible students from all files in the desktop class list folder.`);
}

function signToken(payload) {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: '8h' });
}

function verifyToken(req, res, next) {
  const authHeader = req.headers.authorization || '';
  const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : null;

  if (!token) {
    return res.status(401).json({ success: false, message: 'Authorization token is required.' });
  }

  try {
    req.user = jwt.verify(token, JWT_SECRET);
    next();
  } catch (error) {
    return res.status(401).json({ success: false, message: 'Token is invalid or expired.' });
  }
}

function verifyAdmin(req, res, next) {
  const authHeader = req.headers.authorization || '';
  const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : null;

  if (!token) {
    return res.status(401).json({ success: false, message: 'Admin token is required.' });
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    if (decoded.role !== 'admin') {
      return res.status(403).json({ success: false, message: 'Admin access required.' });
    }
    req.admin = decoded;
    next();
  } catch (error) {
    return res.status(401).json({ success: false, message: 'Admin token is invalid.' });
  }
}

function verifyNominee(req, res, next) {
  const authHeader = req.headers.authorization || '';
  const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : null;

  if (!token) {
    return res.status(401).json({ success: false, message: 'Nominee token is required.' });
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    if (decoded.role !== 'nominee') {
      return res.status(403).json({ success: false, message: 'Nominee access required.' });
    }
    req.nominee = decoded;
    next();
  } catch (error) {
    return res.status(401).json({ success: false, message: 'Nominee token is invalid.' });
  }
}

async function ensureColumn(tableName, columnName, columnDefinition) {
  if (DATABASE_URL) return;
  const columns = await all(`PRAGMA table_info(${tableName})`);
  if (!columns.some((column) => column.name === columnName)) {
    await run(`ALTER TABLE ${tableName} ADD COLUMN ${columnName} ${columnDefinition}`);
    console.log(`Added missing column ${tableName}.${columnName}`);
  }
}

async function fixApprovedStudentsSchema() {
  if (DATABASE_URL) return;
  const indexes = await all("PRAGMA index_list('approved_students')");
  const indexNumberUnique = [];

  for (const index of indexes) {
    if (!index || index.unique !== 1) continue;

    const indexInfo = await all(`PRAGMA index_info('${index.name}')`);
    if (indexInfo.some((column) => column.name === 'indexNumber')) {
      indexNumberUnique.push(index.name);
    }
  }

  if (indexNumberUnique.length > 0) {
    console.log(`Rebuilding approved_students table to remove legacy unique index on indexNumber (${indexNumberUnique.join(', ')})`);

    await run('ALTER TABLE approved_students RENAME TO approved_students_old');
    await run(`CREATE TABLE approved_students (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      firstName TEXT,
      lastName TEXT,
      email TEXT UNIQUE NOT NULL,
      indexNumber TEXT,
      level TEXT DEFAULT '400',
      programme TEXT DEFAULT 'BTECH',
      sourceFile TEXT
    )`);

    await run(`INSERT OR IGNORE INTO approved_students (id, firstName, lastName, email, indexNumber, level, programme, sourceFile)
      SELECT id, firstName, lastName, email, indexNumber, level, programme, sourceFile FROM approved_students_old`);

    await run('DROP TABLE approved_students_old');
  }

  const tableInfo = await all("PRAGMA table_info('approved_students')");
  const hasIndexNumber = tableInfo.some((column) => column.name === 'indexNumber');
  if (hasIndexNumber) {
    await run("UPDATE approved_students SET indexNumber = '400' WHERE indexNumber IS NULL OR TRIM(indexNumber) = ''");
  }
}

async function fixStudentsSchema() {
  if (DATABASE_URL) return;
  const indexes = await all("PRAGMA index_list('students')");
  const indexNumberUnique = [];

  for (const index of indexes) {
    if (!index || index.unique !== 1) continue;

    const indexInfo = await all(`PRAGMA index_info('${index.name}')`);
    if (indexInfo.some((column) => column.name === 'indexNumber')) {
      indexNumberUnique.push(index.name);
    }
  }

  if (indexNumberUnique.length > 0) {
    console.log(`Rebuilding students table to remove legacy unique index on indexNumber (${indexNumberUnique.join(', ')})`);

    await run('ALTER TABLE students RENAME TO students_old');
    await run(`CREATE TABLE students (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      firstName TEXT NOT NULL,
      lastName TEXT NOT NULL,
      email TEXT UNIQUE NOT NULL,
      indexNumber TEXT,
      level TEXT NOT NULL DEFAULT '400',
      programme TEXT,
      department TEXT,
      hasVoted INTEGER DEFAULT 0,
      createdAt TEXT DEFAULT CURRENT_TIMESTAMP
    )`);

    await run(`INSERT OR IGNORE INTO students (id, firstName, lastName, email, indexNumber, level, programme, department, hasVoted, createdAt)
      SELECT id, firstName, lastName, email, indexNumber, level, programme, department, hasVoted, createdAt FROM students_old`);

    await run('DROP TABLE students_old');
  }

  const tableInfo = await all("PRAGMA table_info('students')");
  const hasIndexNumber = tableInfo.some((column) => column.name === 'indexNumber');
  if (hasIndexNumber) {
    await run("UPDATE students SET indexNumber = '400' WHERE indexNumber IS NULL OR TRIM(indexNumber) = ''");
  }
}

async function initializeDatabase() {
  await run(`CREATE TABLE IF NOT EXISTS settings (
    key TEXT PRIMARY KEY,
    value TEXT NOT NULL
  )`);

  await run(`CREATE TABLE IF NOT EXISTS students (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    firstName TEXT NOT NULL,
    lastName TEXT NOT NULL,
    email TEXT UNIQUE NOT NULL,
    indexNumber TEXT,
    level TEXT NOT NULL DEFAULT '400',
    programme TEXT,
    department TEXT,
    hasVoted INTEGER DEFAULT 0,
    createdAt TEXT DEFAULT CURRENT_TIMESTAMP
  )`);

  await fixStudentsSchema();

  await run(`CREATE TABLE IF NOT EXISTS nominees (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    fullName TEXT NOT NULL,
    email TEXT UNIQUE NOT NULL,
    password TEXT NOT NULL,
    portfolio TEXT,
    bio TEXT,
    manifesto TEXT,
    programme TEXT DEFAULT 'BTECH',
    level TEXT DEFAULT '400',
    photoUrl TEXT,
    voteCount INTEGER DEFAULT 0,
    createdAt TEXT DEFAULT CURRENT_TIMESTAMP
  )`);

  await ensureColumn('nominees', 'programme', 'TEXT DEFAULT "BTECH"');
  await ensureColumn('nominees', 'level', 'TEXT DEFAULT "400"');
  await ensureColumn('nominees', 'photoUrl', 'TEXT');
  await ensureColumn('nominees', 'yesVotes', 'INTEGER DEFAULT 0');
  await ensureColumn('nominees', 'noVotes', 'INTEGER DEFAULT 0');
  await ensureColumn('votes', 'voteChoice', 'TEXT DEFAULT "YES"');
  await ensureColumn('nominees', 'voteCount', 'INTEGER DEFAULT 0');

  await run(`CREATE TABLE IF NOT EXISTS votes (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    studentId INTEGER NOT NULL,
    nomineeId INTEGER NOT NULL,
    submittedAt TEXT DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(studentId),
    FOREIGN KEY(studentId) REFERENCES students(id),
    FOREIGN KEY(nomineeId) REFERENCES nominees(id)
  )`);

  if (DATABASE_URL) {
    await db.unsafe('ALTER TABLE votes ADD COLUMN IF NOT EXISTS voteChoice TEXT NOT NULL DEFAULT \'YES\'');
    await db.unsafe('ALTER TABLE nominees ADD COLUMN IF NOT EXISTS yesVotes INTEGER NOT NULL DEFAULT 0');
    await db.unsafe('ALTER TABLE nominees ADD COLUMN IF NOT EXISTS noVotes INTEGER NOT NULL DEFAULT 0');
    await db.unsafe(`DO $$
      BEGIN
        IF EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'votes_studentid_key') THEN
          ALTER TABLE votes DROP CONSTRAINT votes_studentid_key;
        END IF;
      END
    $$`);
    await db.unsafe('CREATE UNIQUE INDEX IF NOT EXISTS votes_student_nominee_key ON votes (studentId, nomineeId)');
  }

  await run(`CREATE TABLE IF NOT EXISTS admin_users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT UNIQUE NOT NULL,
    password TEXT NOT NULL,
    fullName TEXT NOT NULL,
    createdAt TEXT DEFAULT CURRENT_TIMESTAMP
  )`);

  await run(`INSERT INTO settings (key, value) VALUES ('votingOpen', '1') ON CONFLICT (key) DO NOTHING`);
  await run(`INSERT INTO settings (key, value) VALUES ('maxVoters', '400') ON CONFLICT (key) DO NOTHING`);
  await run(`CREATE TABLE IF NOT EXISTS approved_students (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    firstName TEXT,
    lastName TEXT,
    email TEXT UNIQUE NOT NULL,
    indexNumber TEXT,
    level TEXT DEFAULT '400',
    programme TEXT DEFAULT 'BTECH',
    sourceFile TEXT
  )`);

  await fixApprovedStudentsSchema();

  await ensureColumn('approved_students', 'programme', 'TEXT DEFAULT "BTECH"');
  await ensureColumn('approved_students', 'level', 'TEXT DEFAULT "400"');
  await ensureColumn('students', 'programme', 'TEXT');
  await ensureColumn('students', 'level', 'TEXT DEFAULT "400"');
  await ensureColumn('nominees', 'photoUrl', 'TEXT');

  const hash = await bcrypt.hash(ADMIN_PASSWORD, 10);
  await run(
    'INSERT INTO admin_users (username, password, fullName) VALUES (?, ?, ?) ON CONFLICT (username) DO NOTHING',
    [ADMIN_USERNAME, hash, 'Election Administrator']
  );

  const nomineeCount = await get('SELECT COUNT(*) AS total FROM nominees');
  if ((nomineeCount?.total || 0) === 0) {
    const nomineePassword = await bcrypt.hash('nominee123', 10);
    const seededPortfolioPairs = [
      ['Samuel Osei', 'President'],
      ['Kwame Boateng', 'General Secretary'],
      ['Ama Afriyie', 'Public Relations Officer'],
      ['Kwadwo Owusu', 'Financial Officer'],
      ['Adwoa Mensah', 'Organizer'],
      ['Esi Akoto', 'Women Commissioner']
    ];

    for (const [fullName, portfolio] of seededPortfolioPairs) {
      await run(
        'INSERT INTO nominees (fullName, email, password, portfolio, bio, manifesto) VALUES (?, ?, ?, ?, ?, ?)',
        [
          fullName,
          `${fullName.toLowerCase().replace(/\s+/g, '')}@ktu.edu.gh`,
          nomineePassword,
          portfolio,
          'Committed to representing students and improving leadership on campus.',
          'I will work for transparency, service, and positive change for our student community.'
        ]
      );
    }
  }

  const studentSeedCount = await get('SELECT COUNT(*) AS total FROM students');
  if ((studentSeedCount?.total || 0) === 0) {
    const seededStudents = [
      ['Ama', 'Boateng', 'ama1@ktu.edu.gh', 'KTU/400/001', '400', 'Computer Science', 'ICT'],
      ['Kojo', 'Asare', 'kojo1@ktu.edu.gh', 'KTU/400/002', '400', 'Computer Science', 'ICT'],
      ['Efua', 'Owusu', 'efua1@ktu.edu.gh', 'KTU/400/003', '400', 'Electronics', 'Engineering'],
      ['Daniel', 'Nkrumah', 'daniel1@ktu.edu.gh', 'KTU/400/004', '400', 'Business', 'Business School']
    ];

    for (const student of seededStudents) {
      await run(
        'INSERT INTO students (firstName, lastName, email, indexNumber, level, programme, department) VALUES (?, ?, ?, ?, ?, ?, ?)',
        student
      );
    }
  }
}

const initialization = initializeDatabase().then(() => {
  console.log('Database initialization complete');
}).catch((error) => {
  console.error('Database initialization failed:', error);
  throw error;
});

app.get('/api/settings', async (req, res) => {
  const maxVoters = await get('SELECT value FROM settings WHERE key = ?', ['maxVoters']);
  const votingOpen = await get('SELECT value FROM settings WHERE key = ?', ['votingOpen']);
  const eligibleStudentCount = await get('SELECT COUNT(*) AS total FROM approved_students');

  res.json({
    success: true,
    maxVoters: Number(maxVoters?.value || MAX_VOTERS),
    votingOpen: votingOpen?.value === '1',
    eligibleStudentCount: eligibleStudentCount?.total || 0
  });
});

app.post('/api/student/register', async (req, res) => {
  const { firstName, lastName, email, department } = req.body;

  const resolvedLevel = '400';

  if (!firstName || !lastName || !email) {
    return res.status(400).json({ success: false, message: 'First name, last name, and email are required.' });
  }

  const cleanFirstName = firstName.trim();
  const cleanLastName = lastName.trim();
  const cleanEmail = email.trim();
  const safeLevel = resolvedLevel.trim();

  const approvedStudent = await get(
    'SELECT * FROM approved_students WHERE LOWER(email) = LOWER(?)',
    [cleanEmail]
  );

  if (!approvedStudent) {
    return res.status(403).json({
      success: false,
      message: 'This email is not on the eligible student list. Please use a valid approved student email.'
    });
  }

  const existingStudent = await get(
    'SELECT * FROM students WHERE LOWER(email) = LOWER(?)',
    [cleanEmail]
  );

  if (existingStudent) {
    return res.status(409).json({ success: false, message: 'A student with this email already exists. Please log in instead.' });
  }

  const result = await run(
    'INSERT INTO students (firstName, lastName, email, indexNumber, level, programme, department, hasVoted) VALUES (?, ?, ?, ?, ?, ?, ?, 0)',
    [cleanFirstName, cleanLastName, cleanEmail, safeLevel, safeLevel, approvedStudent.programme || 'GENERAL', department || approvedStudent.programme || 'Not set']
  );

  const student = await get('SELECT * FROM students WHERE id = ?', [result.id]);
  const token = signToken({ id: student.id, email: student.email, role: 'student' });

  res.json({
    success: true,
    token,
    student: {
      id: student.id,
      firstName: student.firstName,
      lastName: student.lastName,
      email: student.email,
      indexNumber: student.indexNumber,
      level: student.level,
      programme: student.programme,
      department: student.department,
      hasVoted: false
    },
    message: 'Student registered successfully.'
  });
});

app.post('/api/student/login', async (req, res) => {
  const { email, firstName, lastName } = req.body;

  if (!email) {
    return res.status(400).json({ success: false, message: 'Email is required.' });
  }

  const cleanEmail = email.trim();
  const cleanFirstName = (firstName || '').trim();
  const cleanLastName = (lastName || '').trim();

  const approvedStudent = await get(
    'SELECT * FROM approved_students WHERE LOWER(email) = LOWER(?)',
    [cleanEmail]
  );

  if (!approvedStudent) {
    return res.status(403).json({
      success: false,
      message: 'This email is not on the eligible student list. You cannot log in until your name is added to the approved list.'
    });
  }

  let student = await get(
    'SELECT * FROM students WHERE LOWER(email) = LOWER(?)',
    [cleanEmail]
  );

  if (!student) {
    const autoCreated = await run(
      'INSERT INTO students (firstName, lastName, email, indexNumber, level, programme, department, hasVoted) VALUES (?, ?, ?, ?, ?, ?, ?, 0)',
      [cleanFirstName || approvedStudent.firstName || 'Approved', cleanLastName || approvedStudent.lastName || 'Student', cleanEmail, approvedStudent.indexNumber || '400', approvedStudent.level || '400', approvedStudent.programme || 'GENERAL', 'Not set']
    );
    student = await get('SELECT * FROM students WHERE id = ?', [autoCreated.id]);
  }

  if (cleanFirstName || cleanLastName) {
    await run(
      'UPDATE students SET firstName = ?, lastName = ? WHERE id = ?',
      [cleanFirstName || student.firstName, cleanLastName || student.lastName, student.id]
    );
    student = await get('SELECT * FROM students WHERE id = ?', [student.id]);
  }

  if (student.hasVoted === 1) {
    return res.status(403).json({ success: false, message: 'This student has already voted.' });
  }

  const totalEligible = await get('SELECT COUNT(*) AS total FROM students WHERE level = ?', ['400']);
  if ((totalEligible?.total || 0) > MAX_VOTERS) {
    return res.status(403).json({ success: false, message: 'Voting capacity has been reached.' });
  }

  const token = signToken({ id: student.id, email: student.email, role: 'student' });
  res.json({
    success: true,
    token,
    student: {
      id: student.id,
      firstName: student.firstName,
      lastName: student.lastName,
      email: student.email,
      indexNumber: student.indexNumber,
      level: student.level,
      programme: student.programme,
      department: student.department,
      hasVoted: false
    }
  });
});

app.get('/api/student/me', verifyToken, async (req, res) => {
  const student = await get('SELECT * FROM students WHERE id = ?', [req.user.id]);
  if (!student) {
    return res.status(404).json({ success: false, message: 'Student not found.' });
  }

  res.json({
    success: true,
    student: {
      ...student,
      hasVoted: student.hasVoted === 1
    }
  });
});

app.get('/api/nominees', async (req, res) => {
  const nominees = await all("SELECT id, fullName, email, portfolio, bio, manifesto, programme, level, photoUrl FROM nominees WHERE portfolio <> 'Vice President' ORDER BY portfolio ASC, fullName ASC");
  const publicNominees = nominees.map(limitPublicPhotoSize);
  res.json({ success: true, nominees: publicNominees });
});

app.get('/api/admin/nominees', verifyAdmin, async (req, res) => {
  const nominees = await all("SELECT id, fullName, email, portfolio, bio, manifesto, programme, level, voteCount, yesVotes, noVotes, createdAt FROM nominees WHERE portfolio <> 'Vice President' ORDER BY portfolio ASC, voteCount DESC, fullName ASC");
  res.json({ success: true, nominees });
});

app.post('/api/admin/nominees', verifyAdmin, async (req, res) => {
  const { fullName, email, password, portfolio, bio, manifesto, programme, level, photoUrl } = req.body;

  const resolvedProgramme = normalizeText(programme || 'BTECH').toUpperCase();
  const resolvedLevel = normalizeText(level || '400');
  const cleanPassword = normalizeText(password || 'nominee123');

  if (!fullName || !email || !portfolio || !resolvedProgramme || !resolvedLevel) {
    return res.status(400).json({ success: false, message: 'Full name, email, portfolio, programme, and level are required.' });
  }

  let resolvedPortfolio;
  try {
    resolvedPortfolio = resolvePortfolio(portfolio);
  } catch (error) {
    return res.status(400).json({ success: false, message: error.message });
  }

  const existingNominee = await get('SELECT * FROM nominees WHERE LOWER(email) = LOWER(?)', [email.trim()]);
  if (existingNominee) {
    return res.status(409).json({ success: false, message: 'A nominee with this email already exists.' });
  }

  const hashedPassword = await bcrypt.hash(cleanPassword, 10);
  const savedPhotoUrl = /^data:image\//.test(String(photoUrl || '')) ? photoUrl : null;

  await run(
    'INSERT INTO nominees (fullName, email, password, portfolio, bio, manifesto, programme, level, photoUrl) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?) RETURNING id',
    [fullName.trim(), email.trim(), hashedPassword, resolvedPortfolio, (bio || '').trim(), (manifesto || '').trim(), resolvedProgramme, resolvedLevel, savedPhotoUrl]
  );

  const nominee = await get('SELECT * FROM nominees WHERE LOWER(email) = LOWER(?)', [email.trim()]);
  if (!nominee) {
    return res.status(500).json({ success: false, message: 'Nominee was not saved. Please try again.' });
  }
  res.json({ success: true, nominee, message: 'Nominee added successfully.' });
});

app.put('/api/admin/nominees/:id', verifyAdmin, async (req, res) => {
  const nomineeId = Number(req.params.id);
  if (!nomineeId) {
    return res.status(400).json({ success: false, message: 'Invalid nominee id.' });
  }

  const { fullName, email, portfolio, bio, manifesto, programme, level, photoUrl } = req.body;
  const resolvedProgramme = normalizeText(programme || 'BTECH').toUpperCase();
  const resolvedLevel = normalizeText(level || '400');

  if (!fullName || !email || !portfolio || !resolvedProgramme || !resolvedLevel) {
    return res.status(400).json({ success: false, message: 'Full name, email, portfolio, programme, and level are required.' });
  }

  let resolvedPortfolio;
  try {
    resolvedPortfolio = resolvePortfolio(portfolio);
  } catch (error) {
    return res.status(400).json({ success: false, message: error.message });
  }

  const currentNominee = await get('SELECT * FROM nominees WHERE id = ?', [nomineeId]);
  if (!currentNominee) {
    return res.status(404).json({ success: false, message: 'Nominee not found.' });
  }

  const savedPhotoUrl = /^data:image\//.test(String(photoUrl || '')) ? photoUrl : (currentNominee.photoUrl || null);

  await run(
    'UPDATE nominees SET fullName = ?, email = ?, portfolio = ?, bio = ?, manifesto = ?, programme = ?, level = ?, photoUrl = ? WHERE id = ?',
    [fullName.trim(), email.trim(), resolvedPortfolio, (bio || '').trim(), (manifesto || '').trim(), resolvedProgramme, resolvedLevel, savedPhotoUrl, nomineeId]
  );

  res.json({ success: true, message: 'Nominee updated successfully.' });
});

app.delete('/api/admin/nominees/:id', verifyAdmin, async (req, res) => {
  const nomineeId = Number(req.params.id);
  if (!nomineeId) {
    return res.status(400).json({ success: false, message: 'Invalid nominee id.' });
  }

  const nominee = await get('SELECT * FROM nominees WHERE id = ?', [nomineeId]);
  if (!nominee) {
    return res.status(404).json({ success: false, message: 'Nominee not found.' });
  }

  await run('DELETE FROM votes WHERE nomineeId = ?', [nomineeId]);
  await run('DELETE FROM nominees WHERE id = ?', [nomineeId]);

  res.json({ success: true, message: 'Nominee removed successfully.' });
});

app.post('/api/nominee/register', async (req, res) => {
  const { fullName, email, password, portfolio, bio, manifesto, programme, level, photoUrl } = req.body;

  const resolvedProgramme = normalizeText(programme || 'BTECH').toUpperCase();
  const resolvedLevel = normalizeText(level || '400');

  if (!fullName || !email || !password || !portfolio || !resolvedProgramme || !resolvedLevel) {
    return res.status(400).json({ success: false, message: 'Full name, email, password, programme, level, and portfolio are required.' });
  }

  let resolvedPortfolio;
  try {
    resolvedPortfolio = resolvePortfolio(portfolio);
  } catch (error) {
    return res.status(400).json({ success: false, message: error.message });
  }

  const existingNominee = await get('SELECT * FROM nominees WHERE LOWER(email) = LOWER(?)', [email.trim()]);
  if (existingNominee) {
    return res.status(409).json({ success: false, message: 'A nominee with this email already exists.' });
  }

  const hashedPassword = await bcrypt.hash(password, 10);
  const savedPhotoUrl = /^data:image\//.test(String(photoUrl || '')) ? photoUrl : null;
  await run(
    'INSERT INTO nominees (fullName, email, password, portfolio, bio, manifesto, programme, level, photoUrl) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?) RETURNING id',
    [fullName.trim(), email.trim(), hashedPassword, resolvedPortfolio, (bio || '').trim(), (manifesto || '').trim(), resolvedProgramme, resolvedLevel, savedPhotoUrl]
  );

  const nominee = await get('SELECT * FROM nominees WHERE LOWER(email) = LOWER(?)', [email.trim()]);
  if (!nominee) {
    return res.status(500).json({ success: false, message: 'Nominee was not saved. Please try again.' });
  }
  const token = signToken({ id: nominee.id, email: nominee.email, role: 'nominee' });

  res.json({
    success: true,
    token,
    nominee: {
      id: nominee.id,
      fullName: nominee.fullName,
      email: nominee.email,
      portfolio: nominee.portfolio,
      bio: nominee.bio,
      manifesto: nominee.manifesto,
      programme: nominee.programme,
      level: nominee.level,
      photoUrl: nominee.photoUrl
    },
    message: 'Nominee registered successfully.'
  });
});

app.post('/api/nominee/login', async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ success: false, message: 'Email and password are required.' });
  }

  const nominee = await get('SELECT * FROM nominees WHERE LOWER(email) = LOWER(?)', [email.trim()]);
  if (!nominee) {
    return res.status(404).json({ success: false, message: 'Nominee account not found. Please register first.' });
  }

  const valid = await bcrypt.compare(password, nominee.password);
  if (!valid) {
    return res.status(401).json({ success: false, message: 'Incorrect password.' });
  }

  const token = signToken({ id: nominee.id, email: nominee.email, role: 'nominee' });
  res.json({
    success: true,
    token,
    nominee: {
      id: nominee.id,
      fullName: nominee.fullName,
      email: nominee.email,
      portfolio: nominee.portfolio,
      bio: nominee.bio,
      manifesto: nominee.manifesto,
      programme: nominee.programme,
      level: nominee.level,
      photoUrl: nominee.photoUrl
    }
  });
});

app.get('/api/nominee/me', verifyNominee, async (req, res) => {
  const nominee = await get('SELECT * FROM nominees WHERE id = ?', [req.nominee.id]);
  if (!nominee) {
    return res.status(404).json({ success: false, message: 'Nominee not found.' });
  }

  res.json({ success: true, nominee });
});

app.put('/api/nominee/profile', verifyNominee, async (req, res) => {
  const { fullName, portfolio, bio, manifesto, programme, level, photoUrl } = req.body;
  const resolvedProgramme = normalizeText(programme || 'BTECH').toUpperCase();
  const resolvedLevel = normalizeText(level || '400');

  if (!fullName || !portfolio || !resolvedProgramme || !resolvedLevel) {
    return res.status(400).json({ success: false, message: 'Full name, portfolio, programme, and level are required.' });
  }

  let resolvedPortfolio;
  try {
    resolvedPortfolio = resolvePortfolio(portfolio);
  } catch (error) {
    return res.status(400).json({ success: false, message: error.message });
  }

  const currentNominee = await get('SELECT photoUrl FROM nominees WHERE id = ?', [req.nominee.id]);
  const savedPhotoUrl = /^data:image\//.test(String(photoUrl || '')) ? photoUrl : (currentNominee?.photoUrl || null);

  await run(
    'UPDATE nominees SET fullName = ?, portfolio = ?, bio = ?, manifesto = ?, programme = ?, level = ?, photoUrl = ? WHERE id = ?',
    [fullName.trim(), resolvedPortfolio, (bio || '').trim(), (manifesto || '').trim(), resolvedProgramme, resolvedLevel, savedPhotoUrl, req.nominee.id]
  );

  res.json({ success: true, message: 'Profile updated successfully.' });
});

app.post('/api/vote', verifyToken, async (req, res) => {
  const selections = Array.isArray(req.body.selections)
    ? req.body.selections
    : req.body.nomineeId ? [{ nomineeId: req.body.nomineeId, choice: 'YES' }] : [];

  if (!selections.length) return res.status(400).json({ success: false, message: 'Please complete the ballot.' });

  const settingRow = await get('SELECT value FROM settings WHERE key = ?', ['votingOpen']);
  if (settingRow?.value !== '1') {
    return res.status(403).json({ success: false, message: 'Voting is currently closed.' });
  }

  const currentStudent = await get('SELECT * FROM students WHERE id = ?', [req.user.id]);
  if (!currentStudent) {
    return res.status(404).json({ success: false, message: 'Student record not found.' });
  }

  if (currentStudent.hasVoted === 1) {
    return res.status(403).json({ success: false, message: 'You have already voted.' });
  }

  const nominees = await all("SELECT * FROM nominees WHERE portfolio <> 'Vice President'");
  const nomineeById = new Map(nominees.map((nominee) => [Number(nominee.id), nominee]));
  const normalizedSelections = selections.map((selection) => ({
    nominee: nomineeById.get(Number(selection.nomineeId)),
    choice: String(selection.choice || 'YES').toUpperCase()
  }));
  if (normalizedSelections.some((selection) => !selection.nominee || !['YES', 'NO'].includes(selection.choice))) {
    return res.status(400).json({ success: false, message: 'Invalid ballot selection.' });
  }
  const presidentSelections = normalizedSelections.filter(({ nominee }) => nominee.portfolio === 'President');
  if (presidentSelections.length !== 1 || normalizedSelections.filter(({ nominee }) => nominee.portfolio === 'President').length !== 1 || presidentSelections[0].choice !== 'YES') {
    return res.status(400).json({ success: false, message: 'Select exactly one President.' });
  }
  for (const nominee of nominees.filter((entry) => entry.portfolio !== 'President')) {
    const nomineeSelections = normalizedSelections.filter(({ nominee: selectedNominee }) => selectedNominee.id === nominee.id);
    if (nomineeSelections.length !== 1) return res.status(400).json({ success: false, message: `Select Yes or No for ${nominee.fullName}.` });
  }

  for (const { nominee, choice } of normalizedSelections) {
    await run('INSERT INTO votes (studentId, nomineeId, voteChoice) VALUES (?, ?, ?)', [req.user.id, nominee.id, choice]);
    await run(`UPDATE nominees SET ${choice === 'YES' ? 'voteCount = voteCount + 1, yesVotes = yesVotes + 1' : 'noVotes = noVotes + 1'} WHERE id = ?`, [nominee.id]);
  }
  await run('UPDATE students SET hasVoted = 1 WHERE id = ?', [req.user.id]);

  res.json({
    success: true,
    message: 'Your ballot was recorded successfully.',
    student: {
      id: currentStudent.id,
      fullName: `${currentStudent.firstName} ${currentStudent.lastName}`,
      votedFor: presidentSelections[0].nominee.fullName
    }
  });
});

app.post('/api/admin/login', async (req, res) => {
  const { username, password } = req.body;

  if (!username || !password) {
    return res.status(400).json({ success: false, message: 'Username and password are required.' });
  }

  const admin = await get('SELECT * FROM admin_users WHERE username = ?', [username]);
  if (!admin) {
    return res.status(401).json({ success: false, message: 'Invalid admin login.' });
  }

  const valid = await bcrypt.compare(password, admin.password);
  if (!valid) {
    return res.status(401).json({ success: false, message: 'Invalid admin login.' });
  }

  const token = signToken({ id: admin.id, username: admin.username, role: 'admin' });
  res.json({ success: true, token, admin: { id: admin.id, username: admin.username, fullName: admin.fullName } });
});

app.put('/api/admin/password', verifyAdmin, async (req, res) => {
  const { currentPassword, newPassword } = req.body;
  if (!currentPassword || !newPassword || String(newPassword).length < 8) {
    return res.status(400).json({ success: false, message: 'Current password and a new password of at least 8 characters are required.' });
  }

  const admin = await get('SELECT * FROM admin_users WHERE id = ?', [req.admin.id]);
  if (!admin || !(await bcrypt.compare(currentPassword, admin.password))) {
    return res.status(401).json({ success: false, message: 'Current password is incorrect.' });
  }

  const hash = await bcrypt.hash(String(newPassword), 10);
  await run('UPDATE admin_users SET password = ? WHERE id = ?', [hash, req.admin.id]);
  res.json({ success: true, message: 'Admin password changed successfully.' });
});

app.get('/api/admin/dashboard', verifyAdmin, async (req, res) => {
  const totalVotes = await get('SELECT COUNT(DISTINCT studentId) AS total FROM votes');
  const totalStudents = await get('SELECT COUNT(*) AS total FROM approved_students');
  const totalNominees = await get("SELECT COUNT(*) AS total FROM nominees WHERE portfolio <> 'Vice President'");
  const votingOpen = await get('SELECT value FROM settings WHERE key = ?', ['votingOpen']);
  const maxVoters = await get('SELECT value FROM settings WHERE key = ?', ['maxVoters']);
  const nominees = await all("SELECT * FROM nominees WHERE portfolio <> 'Vice President' ORDER BY voteCount DESC");
  const recordsByLevel = await all('SELECT level, COUNT(*) AS total FROM students GROUP BY level ORDER BY level DESC');

  const winner = nominees.length > 0 ? nominees[0] : null;
  const turnout = totalStudents?.total ? ((totalVotes?.total || 0) / Number(totalStudents.total)) * 100 : 0;

  res.json({
    success: true,
    stats: {
      totalVotes: totalVotes?.total || 0,
      totalStudents: totalStudents?.total || 0,
      totalNominees: totalNominees?.total || 0,
      turnout: Number(turnout.toFixed(2)),
      votingOpen: votingOpen?.value === '1',
      maxVoters: Number(maxVoters?.value || MAX_VOTERS),
      winner,
      recordsByLevel
    }
  });
});

app.get('/api/admin/records', verifyAdmin, async (req, res) => {
  const rows = await all(`
    SELECT v.id, s.firstName, s.lastName, s.email, s.indexNumber, s.level, s.programme, n.fullName AS nomineeName, v.submittedAt
    FROM votes v
    JOIN students s ON s.id = v.studentId
    JOIN nominees n ON n.id = v.nomineeId
    ORDER BY s.level DESC, v.submittedAt DESC
  `);

  res.json({ success: true, records: rows });
});

app.get('/api/admin/approved-students', verifyAdmin, async (req, res) => {
  const rows = await all(`
    SELECT a.id, a.firstName, a.lastName, a.email, a.level, a.programme,
      CASE WHEN s.hasVoted = 1 THEN 1 ELSE 0 END AS hasVoted
    FROM approved_students a
    LEFT JOIN students s ON LOWER(s.email) = LOWER(a.email)
    ORDER BY a.level DESC, a.lastName ASC, a.firstName ASC
  `);

  res.json({ success: true, students: rows });
});

app.post('/api/admin/approved-students/bulk', verifyAdmin, async (req, res) => {
  try {
    const payload = req.body || {};
    let rawEntries = [];

    if (Array.isArray(payload)) {
      rawEntries = payload;
    } else if (Array.isArray(payload.students)) {
      rawEntries = payload.students;
    } else if (typeof payload === 'string') {
      rawEntries = parseBulkApprovedStudentsInput(payload);
    } else if (payload.text) {
      rawEntries = parseBulkApprovedStudentsInput(payload.text);
    } else if (payload.list) {
      rawEntries = parseBulkApprovedStudentsInput(payload.list);
    } else {
      rawEntries = parseBulkApprovedStudentsInput(JSON.stringify(payload));
    }

    const entries = rawEntries
      .map((student) => {
        if (student && typeof student === 'object') {
          const email = normalizeText(student.email || student.studentEmail || student.emailAddress || '').toLowerCase();
          if (!email) return null;
          return {
            firstName: normalizeText(student.firstName || student.first_name || 'Student'),
            lastName: normalizeText(student.lastName || student.last_name || 'Approved'),
            email,
            indexNumber: normalizeText(student.indexNumber || student.index_number || '400'),
            level: normalizeText(student.level || '400'),
            programme: normalizeText(student.programme || student.program || 'GENERAL').toUpperCase()
          };
        }
        return null;
      })
      .filter(Boolean);

    if (!entries.length) {
      return res.status(400).json({ success: false, message: 'No valid student records were supplied.' });
    }

    let insertedCount = 0;
    let updatedCount = 0;
    const seen = new Set();

    for (const student of entries) {
      const email = student.email.toLowerCase();
      if (seen.has(email)) continue;
      seen.add(email);

      const existing = await get('SELECT * FROM approved_students WHERE LOWER(email) = LOWER(?)', [email]);
      if (existing) {
        await run(
          'UPDATE approved_students SET firstName = ?, lastName = ?, indexNumber = ?, level = ?, programme = ? WHERE id = ?',
          [student.firstName || 'Student', student.lastName || 'Approved', student.indexNumber || '400', student.level || '400', student.programme || 'GENERAL', existing.id]
        );
        updatedCount += 1;
      } else {
        await run(
          'INSERT INTO approved_students (firstName, lastName, email, indexNumber, level, programme, sourceFile) VALUES (?, ?, ?, ?, ?, ?, ?)',
          [student.firstName || 'Student', student.lastName || 'Approved', email, `STU-${Date.now()}-${Math.floor(Math.random() * 10000)}`, student.level || '400', student.programme || 'GENERAL', 'admin_dashboard_bulk']
        );
        insertedCount += 1;
      }
    }

    const total = await get('SELECT COUNT(*) AS total FROM approved_students');
    res.json({
      success: true,
      message: `Approved student list updated. Added ${insertedCount}, updated ${updatedCount}.`,
      insertedCount,
      updatedCount,
      total: total?.total || 0
    });
  } catch (error) {
    console.error('Bulk approved student import failed:', error);
    res.status(500).json({ success: false, message: 'Bulk approved student import failed.' });
  }
});

app.post('/api/admin/sync-class-list', verifyAdmin, async (req, res) => {
  try {
    if (DATABASE_URL) {
      await insertApprovedStudents(loadApprovedStudentsFromTextFile());
    } else {
      await syncApprovedStudentsFromClassList();
    }
    const total = await get('SELECT COUNT(*) AS total FROM approved_students');
    res.json({
      success: true,
      message: 'Eligible student list refreshed from the Desktop class list.',
      total: total?.total || 0
    });
  } catch (error) {
    console.error('Class list sync failed:', error);
    res.status(500).json({ success: false, message: 'Failed to sync the eligible student list.' });
  }
});

app.delete('/api/admin/votes/:voteId', verifyAdmin, async (req, res) => {
  const voteId = Number(req.params.voteId);

  if (!voteId) {
    return res.status(400).json({ success: false, message: 'Invalid vote id.' });
  }

  const vote = await get('SELECT studentId, nomineeId FROM votes WHERE id = ?', [voteId]);
  if (!vote) {
    return res.status(404).json({ success: false, message: 'Vote record not found.' });
  }

  await run('DELETE FROM votes WHERE id = ?', [voteId]);
  await run('UPDATE students SET hasVoted = 0 WHERE id = ?', [vote.studentId]);
  await run('UPDATE nominees SET voteCount = MAX(voteCount - 1, 0) WHERE id = ?', [vote.nomineeId]);

  res.json({ success: true, message: 'Vote deleted successfully.' });
});

app.get('/api/admin/export', verifyAdmin, async (req, res) => {
  const rows = await all(`
    SELECT s.firstName, s.lastName, s.email, s.indexNumber, s.level, s.programme, n.fullName AS votedFor, v.submittedAt
    FROM votes v
    JOIN students s ON s.id = v.studentId
    JOIN nominees n ON n.id = v.nomineeId
    ORDER BY v.submittedAt DESC
  `);

  const totalVoters = rows.length;
  const headers = ['First Name', 'Last Name', 'Email', 'Index Number', 'Level', 'Programme', 'Voted For', 'Submitted At'];
  const csvRows = [
    `Total Students Who Voted,${totalVoters}`,
    '',
    headers.join(',')
  ];

  rows.forEach((row) => {
    const values = headers.map((header) => {
      const key = {
        'First Name': 'firstName',
        'Last Name': 'lastName',
        'Email': 'email',
        'Index Number': 'indexNumber',
        'Level': 'level',
        'Programme': 'programme',
        'Voted For': 'votedFor',
        'Submitted At': 'submittedAt'
      }[header];
      const value = row[key] ?? '';
      return `"${String(value).replace(/"/g, '""')}"`;
    });
    csvRows.push(values.join(','));
  });

  res.setHeader('Content-Type', 'text/csv');
  res.setHeader('Content-Disposition', 'attachment; filename="ktu-voting-records.csv"');
  res.send(csvRows.join('\n'));
});

app.post('/api/admin/toggle-voting', verifyAdmin, async (req, res) => {
  const { open } = req.body;
  const nextValue = open ? '1' : '0';

  await run('INSERT INTO settings (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value', ['votingOpen', nextValue]);

  res.json({
    success: true,
    message: `Voting ${open ? 'opened' : 'closed'} successfully.`,
    votingOpen: Boolean(open)
  });
});

app.get('/api/admin/winner', verifyAdmin, async (req, res) => {
  const nominees = await all('SELECT * FROM nominees ORDER BY voteCount DESC, fullName ASC');
  const winner = nominees[0] || null;

  res.json({ success: true, winner });
});

app.get('/api/health', (req, res) => {
  res.json({ success: true, message: 'KTU voting system is running.' });
});

app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

if (require.main === module) {
  app.listen(PORT, () => {
    console.log(`KTU election server running at http://localhost:${PORT}`);
  });
}

module.exports = { app, initialization };
