/* ============================================
   KTU ELECTION SYSTEM - DATABASE SCHEMA
   MySQL Database Structure
   ============================================ */

-- Create database
CREATE DATABASE IF NOT EXISTS ktu_election;
USE ktu_election;

-- ============================================
-- ELECTIONS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS elections (
    id INT PRIMARY KEY AUTO_INCREMENT,
    electionName VARCHAR(255) NOT NULL,
    electionYear INT NOT NULL,
    electionDate DATETIME,
    startTime DATETIME,
    endTime DATETIME,
    status ENUM('DRAFT', 'UPCOMING', 'OPEN', 'PAUSED', 'CLOSED', 'RESULTS_PUBLISHED') DEFAULT 'DRAFT',
    resultVisibility ENUM('HIDDEN', 'ADMIN_ONLY', 'PUBLISHED') DEFAULT 'HIDDEN',
    tagline VARCHAR(255),
    description TEXT,
    createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_status (status),
    INDEX idx_year (electionYear)
);

-- ============================================
-- POSITIONS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS positions (
    id INT PRIMARY KEY AUTO_INCREMENT,
    electionId INT NOT NULL,
    positionName VARCHAR(255) NOT NULL,
    positionCode VARCHAR(50) UNIQUE NOT NULL,
    description TEXT,
    maximumWinners INT DEFAULT 1,
    maximumCandidates INT,
    orderSequence INT,
    createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (electionId) REFERENCES elections(id) ON DELETE CASCADE,
    INDEX idx_election (electionId),
    UNIQUE KEY unique_position_per_election (electionId, positionCode)
);

-- ============================================
-- STUDENTS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS students (
    id INT PRIMARY KEY AUTO_INCREMENT,
    firstName VARCHAR(100) NOT NULL,
    lastName VARCHAR(100) NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    indexNumber VARCHAR(50) UNIQUE NOT NULL,
    level ENUM('100', '200', '300', '400') NOT NULL,
    programme VARCHAR(255),
    department VARCHAR(255),
    photoUrl VARCHAR(255),
    eligibilityStatus ENUM('ELIGIBLE', 'INELIGIBLE', 'SUSPENDED') DEFAULT 'ELIGIBLE',
    enrollmentDate DATE,
    createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_email (email),
    INDEX idx_index (indexNumber),
    INDEX idx_level (level),
    INDEX idx_eligible (eligibilityStatus)
);

-- ============================================
-- CANDIDATES TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS candidates (
    id INT PRIMARY KEY AUTO_INCREMENT,
    electionId INT NOT NULL,
    positionId INT NOT NULL,
    studentId INT NOT NULL,
    candidateCode VARCHAR(50) UNIQUE NOT NULL,
    candidateName VARCHAR(255) NOT NULL,
    email VARCHAR(255),
    programme VARCHAR(255),
    department VARCHAR(255),
    photoUrl VARCHAR(255),
    biography TEXT,
    manifesto TEXT,
    vision TEXT,
    mission TEXT,
    campaignMessage TEXT,
    status ENUM('PENDING', 'APPROVED', 'REJECTED', 'ACTIVE', 'INACTIVE') DEFAULT 'PENDING',
    registrationDate DATETIME,
    approvalDate DATETIME,
    approvedBy INT,
    createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (electionId) REFERENCES elections(id) ON DELETE CASCADE,
    FOREIGN KEY (positionId) REFERENCES positions(id) ON DELETE CASCADE,
    FOREIGN KEY (studentId) REFERENCES students(id) ON DELETE CASCADE,
    FOREIGN KEY (approvedBy) REFERENCES admins(id),
    INDEX idx_election (electionId),
    INDEX idx_position (positionId),
    INDEX idx_status (status),
    INDEX idx_code (candidateCode),
    UNIQUE KEY unique_candidate_per_position (positionId, studentId)
);

-- ============================================
-- VOTES TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS votes (
    id INT PRIMARY KEY AUTO_INCREMENT,
    electionId INT NOT NULL,
    studentId INT NOT NULL,
    submittedAt DATETIME DEFAULT CURRENT_TIMESTAMP,
    ipAddress VARCHAR(45),
    userAgent TEXT,
    createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (electionId) REFERENCES elections(id) ON DELETE CASCADE,
    FOREIGN KEY (studentId) REFERENCES students(id) ON DELETE CASCADE,
    UNIQUE KEY unique_vote_per_student (electionId, studentId),
    INDEX idx_election (electionId),
    INDEX idx_student (studentId),
    INDEX idx_timestamp (submittedAt)
);

-- ============================================
-- VOTE ITEMS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS voteItems (
    id INT PRIMARY KEY AUTO_INCREMENT,
    voteId INT NOT NULL,
    positionId INT NOT NULL,
    candidateId INT NOT NULL,
    createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (voteId) REFERENCES votes(id) ON DELETE CASCADE,
    FOREIGN KEY (positionId) REFERENCES positions(id) ON DELETE CASCADE,
    FOREIGN KEY (candidateId) REFERENCES candidates(id) ON DELETE CASCADE,
    INDEX idx_vote (voteId),
    INDEX idx_position (positionId),
    INDEX idx_candidate (candidateId)
);

-- ============================================
-- ADMINS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS admins (
    id INT PRIMARY KEY AUTO_INCREMENT,
    username VARCHAR(100) UNIQUE NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    password VARCHAR(255) NOT NULL,
    fullName VARCHAR(255),
    role ENUM('SUPER_ADMIN', 'ELECTION_ADMIN', 'RESULTS_ADMIN', 'VIEW_ONLY_ADMIN') DEFAULT 'ELECTION_ADMIN',
    status ENUM('ACTIVE', 'INACTIVE', 'SUSPENDED') DEFAULT 'ACTIVE',
    lastLogin DATETIME,
    createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_username (username),
    INDEX idx_role (role)
);

-- ============================================
-- AUDIT LOGS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS auditLogs (
    id INT PRIMARY KEY AUTO_INCREMENT,
    adminId INT,
    action VARCHAR(100) NOT NULL,
    details JSON,
    ipAddress VARCHAR(45),
    timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (adminId) REFERENCES admins(id) ON DELETE SET NULL,
    INDEX idx_admin (adminId),
    INDEX idx_action (action),
    INDEX idx_timestamp (timestamp)
);

-- ============================================
-- RESULTS CACHE TABLE (for performance)
-- ============================================
CREATE TABLE IF NOT EXISTS resultCache (
    id INT PRIMARY KEY AUTO_INCREMENT,
    electionId INT NOT NULL,
    positionId INT NOT NULL,
    candidateId INT NOT NULL,
    totalVotes INT DEFAULT 0,
    percentage DECIMAL(5, 2),
    rank INT,
    isWinner BOOLEAN DEFAULT FALSE,
    cachedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (electionId) REFERENCES elections(id) ON DELETE CASCADE,
    FOREIGN KEY (positionId) REFERENCES positions(id) ON DELETE CASCADE,
    FOREIGN KEY (candidateId) REFERENCES candidates(id) ON DELETE CASCADE,
    UNIQUE KEY unique_result (electionId, positionId, candidateId),
    INDEX idx_position (positionId),
    INDEX idx_election (electionId)
);

-- ============================================
-- SAMPLE DATA
-- ============================================

-- Create sample election
INSERT INTO elections (
    electionName, 
    electionYear, 
    electionDate, 
    startTime, 
    endTime, 
    status, 
    tagline,
    description
) VALUES (
    'KTU Level 400 Student Election 2026',
    2026,
    '2026-02-20',
    '2026-02-20 08:00:00',
    '2026-02-20 17:00:00',
    'OPEN',
    'Your Voice. Your Choice. Your Future.',
    'Election for KTU Level 400 Student Leaders'
);

-- Create sample positions
INSERT INTO positions (electionId, positionName, positionCode, description, maximumWinners, orderSequence) VALUES
(1, 'President', 'PRES', 'Overall leader of Level 400 students', 1, 1),
(1, 'Vice President', 'VP', 'Second-in-command', 1, 2),
(1, 'Secretary', 'SEC', 'Record keeper and communicator', 1, 3),
(1, 'Treasurer', 'TREAS', 'Financial officer', 1, 4),
(1, 'Organizing Secretary', 'ORG_SEC', 'Event coordinator', 1, 5),
(1, 'Public Relations Officer', 'PRO', 'Public face of the class', 1, 6);

-- Create sample admin account
INSERT INTO admins (username, email, password, fullName, role) VALUES
('admin', 'admin@ktu.edu.gh', '$2a$10$YourHashedPasswordHere', 'Election Administrator', 'SUPER_ADMIN');

-- ============================================
-- VIEWS FOR COMMON QUERIES
-- ============================================

-- View: Vote Summary
CREATE OR REPLACE VIEW voteSummary AS
SELECT 
    c.id as candidateId,
    c.candidateCode,
    c.candidateName,
    p.positionName,
    COUNT(vi.id) as totalVotes
FROM candidates c
JOIN positions p ON c.positionId = p.id
LEFT JOIN voteItems vi ON c.id = vi.candidateId
GROUP BY c.id, p.id;

-- View: Voter Participation
CREATE OR REPLACE VIEW voterParticipation AS
SELECT 
    COUNT(DISTINCT s.id) as totalEligibleStudents,
    COUNT(DISTINCT v.studentId) as totalVoters,
    ROUND((COUNT(DISTINCT v.studentId) / COUNT(DISTINCT s.id) * 100), 2) as turnoutPercentage
FROM students s
LEFT JOIN votes v ON s.id = v.studentId
WHERE s.level = '400' AND s.eligibilityStatus = 'ELIGIBLE';

-- ============================================
-- INDEXES FOR OPTIMIZATION
-- ============================================

-- Additional performance indexes
CREATE INDEX idx_votes_timestamp ON votes(submittedAt);
CREATE INDEX idx_candidates_election_position ON candidates(electionId, positionId);
CREATE INDEX idx_students_level_eligible ON students(level, eligibilityStatus);
CREATE INDEX idx_audit_timestamp_action ON auditLogs(timestamp, action);

-- ============================================
-- TRIGGERS (Optional)
-- ============================================

-- Trigger to update resultCache when vote is inserted
DELIMITER //

CREATE TRIGGER updateResultCacheOnVote
AFTER INSERT ON voteItems
FOR EACH ROW
BEGIN
    INSERT INTO resultCache (electionId, positionId, candidateId, totalVotes)
    SELECT 
        c.electionId,
        c.positionId,
        c.id,
        COUNT(vi.id)
    FROM candidates c
    LEFT JOIN voteItems vi ON c.id = vi.candidateId
    WHERE c.id = NEW.candidateId
    ON DUPLICATE KEY UPDATE totalVotes = VALUES(totalVotes);
END //

DELIMITER ;

-- ============================================
-- PERMISSIONS (For security)
-- ============================================

-- Create application user with limited privileges
-- (Uncomment and customize as needed)
/*
CREATE USER 'ktu_app'@'localhost' IDENTIFIED BY 'secure_password';
GRANT SELECT, INSERT, UPDATE ON ktu_election.* TO 'ktu_app'@'localhost';
FLUSH PRIVILEGES;
*/

-- ============================================
-- BACKUP RECOMMENDATION
-- ============================================
-- Run regular backups with:
-- mysqldump -u root -p ktu_election > ktu_election_backup.sql
