# Database Design Document - Nigeria E-Voting System

## Overview

This document outlines the comprehensive database design for the Nigeria E-Voting System, including entity relationships, security considerations, and data flow patterns.

## Database Architecture

### Storage Strategy
- **Primary Storage:** IndexedDB (client-side encrypted storage)
- **Blockchain Ledger:** Immutable vote records
- **Audit Chain:** Hash-linked audit logs
- **Backup Strategy:** Encrypted multi-location backups

## Entity Relationship Diagram

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│     Voters      │    │    Elections    │    │   Candidates    │
│                 │    │                 │    │                 │
│ PK: id          │    │ PK: id          │    │ PK: id          │
│    nin (enc)    │    │    title        │    │    electionId   │
│    firstName    │    │    type         │    │    name         │
│    lastName     │    │    startDate    │    │    party        │
│    dateOfBirth  │    │    endDate      │    │    position     │
│    biometricHash│    │    status       │    │                 │
│    ...          │    │    ...          │    │                 │
└─────────────────┘    └─────────────────┘    └─────────────────┘
         │                       │                       │
         │                       │                       │
         └───────────────────────┼───────────────────────┘
                                 │
         ┌─────────────────────────────────────────────────┐
         │                    Votes                        │
         │                                                 │
         │ PK: id                                          │
         │ FK: electionId → Elections.id                   │
         │ FK: candidateId → Candidates.id                 │
         │     voterNIN (hashed)                           │
         │     timestamp                                   │
         │     blockchainHash                              │
         │     receiptCode                                 │
         │     ...                                         │
         └─────────────────────────────────────────────────┘
                                 │
         ┌─────────────────────────────────────────────────┐
         │                 AuditLogs                       │
         │                                                 │
         │ PK: id                                          │
         │    timestamp                                    │
         │    eventType                                    │
         │    userId                                       │
         │    voterNin (hashed)                            │
         │    result                                       │
         │    details                                      │
         │    previousHash                                 │
         │    currentHash                                  │
         │    ...                                          │
         └─────────────────────────────────────────────────┘
```

## Detailed Entity Specifications

### 1. Voters Table

```sql
CREATE TABLE voters (
    id VARCHAR(36) PRIMARY KEY,
    nin_encrypted TEXT NOT NULL,
    nin_hash VARCHAR(64) NOT NULL UNIQUE,
    first_name VARCHAR(100) NOT NULL,
    last_name VARCHAR(100) NOT NULL,
    date_of_birth DATE NOT NULL,
    sex ENUM('male', 'female') NOT NULL,
    email VARCHAR(255),
    phone VARCHAR(20),
    state VARCHAR(100) NOT NULL,
    lga VARCHAR(100) NOT NULL,
    ward VARCHAR(100) NOT NULL,
    polling_unit VARCHAR(100) NOT NULL,
    
    -- Biometric Data (encrypted)
    biometric_hash VARCHAR(128) NOT NULL,
    face_embedding_encrypted LONGTEXT NOT NULL,
    biometric_quality DECIMAL(3,2) NOT NULL,
    
    -- Registration & Status
    registration_date TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    is_verified BOOLEAN NOT NULL DEFAULT FALSE,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    eligible_elections JSON,
    has_voted JSON,
    
    -- Security & Audit
    login_attempts INT NOT NULL DEFAULT 0,
    biometric_attempts INT NOT NULL DEFAULT 0,
    last_login_attempt TIMESTAMP NULL,
    last_biometric_attempt TIMESTAMP NULL,
    registration_source ENUM('online', 'offline') NOT NULL,
    
    -- Privacy Compliance
    consent_given BOOLEAN NOT NULL DEFAULT FALSE,
    consent_date TIMESTAMP NULL,
    consent_version VARCHAR(20) NOT NULL,
    data_processing_agreement BOOLEAN NOT NULL DEFAULT FALSE,
    
    -- Hash Chain for Tamper Evidence
    previous_hash VARCHAR(64),
    current_hash VARCHAR(64) NOT NULL,
    
    -- Indexes
    INDEX idx_nin_hash (nin_hash),
    INDEX idx_registration_date (registration_date),
    INDEX idx_state_lga (state, lga),
    INDEX idx_active_verified (is_active, is_verified)
);
```

### 2. Elections Table

```sql
CREATE TABLE elections (
    id VARCHAR(36) PRIMARY KEY,
    title VARCHAR(255) NOT NULL,
    type ENUM('presidential', 'gubernatorial', 'national_assembly', 'state_assembly', 'local_government') NOT NULL,
    description TEXT,
    start_date TIMESTAMP NOT NULL,
    end_date TIMESTAMP NOT NULL,
    status ENUM('draft', 'active', 'completed', 'cancelled') NOT NULL DEFAULT 'draft',
    state VARCHAR(100),
    lga VARCHAR(100),
    constituency VARCHAR(100),
    created_by VARCHAR(36) NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    -- Indexes
    INDEX idx_status_dates (status, start_date, end_date),
    INDEX idx_type_location (type, state, lga),
    INDEX idx_created_by (created_by)
);
```

### 3. Candidates Table

```sql
CREATE TABLE candidates (
    id VARCHAR(36) PRIMARY KEY,
    election_id VARCHAR(36) NOT NULL,
    name VARCHAR(255) NOT NULL,
    party VARCHAR(100) NOT NULL,
    position INT NOT NULL,
    photo_url VARCHAR(500),
    biography TEXT,
    manifesto TEXT,
    
    FOREIGN KEY (election_id) REFERENCES elections(id) ON DELETE CASCADE,
    INDEX idx_election_position (election_id, position)
);
```

### 4. Votes Table

```sql
CREATE TABLE votes (
    id VARCHAR(36) PRIMARY KEY,
    election_id VARCHAR(36) NOT NULL,
    candidate_id VARCHAR(36) NOT NULL,
    voter_nin_hash VARCHAR(64) NOT NULL,
    timestamp TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    biometric_hash VARCHAR(128) NOT NULL,
    blockchain_hash VARCHAR(128),
    receipt_code VARCHAR(128) NOT NULL UNIQUE,
    is_offline BOOLEAN NOT NULL DEFAULT FALSE,
    sync_status ENUM('pending', 'synced', 'failed') NOT NULL DEFAULT 'synced',
    
    FOREIGN KEY (election_id) REFERENCES elections(id),
    FOREIGN KEY (candidate_id) REFERENCES candidates(id),
    INDEX idx_election_timestamp (election_id, timestamp),
    INDEX idx_receipt_code (receipt_code),
    INDEX idx_sync_status (sync_status)
);
```

### 5. Audit Logs Table

```sql
CREATE TABLE audit_logs (
    id VARCHAR(36) PRIMARY KEY,
    timestamp TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    event_type ENUM('login_attempt', 'registration', 'biometric_capture', 'nin_validation', 'consent_given', 'vote_cast') NOT NULL,
    user_id VARCHAR(36),
    voter_nin_hash VARCHAR(64),
    result ENUM('success', 'failure', 'pending') NOT NULL,
    details TEXT NOT NULL,
    metadata JSON,
    ip_address VARCHAR(45),
    user_agent TEXT,
    session_id VARCHAR(128) NOT NULL,
    previous_hash VARCHAR(64),
    current_hash VARCHAR(64) NOT NULL,
    
    INDEX idx_timestamp (timestamp),
    INDEX idx_event_type (event_type),
    INDEX idx_result (result),
    INDEX idx_session_id (session_id),
    INDEX idx_hash_chain (previous_hash, current_hash)
);
```

### 6. System Configuration Table

```sql
CREATE TABLE system_config (
    id VARCHAR(36) PRIMARY KEY,
    config_key VARCHAR(100) NOT NULL UNIQUE,
    config_value JSON NOT NULL,
    description TEXT,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    updated_by VARCHAR(36) NOT NULL,
    
    INDEX idx_config_key (config_key)
);
```

### 7. Users Table (Admin)

```sql
CREATE TABLE users (
    id VARCHAR(36) PRIMARY KEY,
    email VARCHAR(255) NOT NULL UNIQUE,
    password_hash VARCHAR(128) NOT NULL,
    role ENUM('admin', 'election_officer', 'observer') NOT NULL,
    name VARCHAR(255) NOT NULL,
    state VARCHAR(100),
    lga VARCHAR(100),
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    last_login TIMESTAMP NULL,
    failed_login_attempts INT NOT NULL DEFAULT 0,
    locked_until TIMESTAMP NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    INDEX idx_email (email),
    INDEX idx_role (role),
    INDEX idx_active (is_active)
);
```

## Data Security Measures

### 1. Encryption Strategy

**Field-Level Encryption:**
- `nin_encrypted`: AES-256-GCM encrypted NIN
- `face_embedding_encrypted`: Encrypted biometric embeddings
- `password_hash`: bcrypt with salt rounds ≥12

**Hashing Strategy:**
- `nin_hash`: SHA-256 with application-specific salt
- `voter_nin_hash`: SHA-256 with different salt for privacy
- `biometric_hash`: SHA-256 of face embedding for quick comparison

### 2. Data Integrity

**Hash Chaining:**
```javascript
// Voter hash chain
const voterHash = SHA256(
    voter.id + 
    voter.nin_encrypted + 
    voter.registration_date + 
    voter.previous_hash
);

// Audit log hash chain
const auditHash = SHA256(
    log.id + 
    log.timestamp + 
    log.event_type + 
    log.details + 
    log.previous_hash
);
```

**Blockchain Integration:**
```javascript
// Vote blockchain record
const blockData = {
    type: 'vote_cast',
    voteId: vote.id,
    electionId: vote.election_id,
    candidateId: vote.candidate_id,
    voterHash: vote.voter_nin_hash,
    timestamp: vote.timestamp,
    signature: generateVoteSignature(vote)
};
```

## Data Access Patterns

### 1. Voter Registration Flow
```sql
-- Step 1: Check if NIN exists
SELECT id FROM voters WHERE nin_hash = ?;

-- Step 2: Insert new voter with hash chain
INSERT INTO voters (
    id, nin_encrypted, nin_hash, first_name, last_name,
    previous_hash, current_hash, ...
) VALUES (?, ?, ?, ?, ?, ?, ?, ...);

-- Step 3: Log registration event
INSERT INTO audit_logs (
    id, event_type, user_id, details, previous_hash, current_hash, ...
) VALUES (?, 'registration', ?, ?, ?, ?, ...);
```

### 2. Voter Authentication Flow
```sql
-- Step 1: Find voter by NIN hash
SELECT * FROM voters WHERE nin_hash = ? AND is_active = TRUE;

-- Step 2: Update login attempts
UPDATE voters SET 
    login_attempts = login_attempts + 1,
    last_login_attempt = CURRENT_TIMESTAMP
WHERE id = ?;

-- Step 3: Log authentication attempt
INSERT INTO audit_logs (
    event_type, user_id, result, details, session_id, ...
) VALUES ('login_attempt', ?, ?, ?, ?, ...);
```

### 3. Vote Casting Flow
```sql
-- Step 1: Verify voter eligibility
SELECT id, has_voted FROM voters 
WHERE nin_hash = ? AND is_active = TRUE AND is_verified = TRUE;

-- Step 2: Insert vote record
INSERT INTO votes (
    id, election_id, candidate_id, voter_nin_hash,
    biometric_hash, receipt_code, ...
) VALUES (?, ?, ?, ?, ?, ?, ...);

-- Step 3: Update voter's voting status
UPDATE voters SET 
    has_voted = JSON_SET(has_voted, '$.election_id', TRUE)
WHERE nin_hash = ?;

-- Step 4: Log vote casting
INSERT INTO audit_logs (
    event_type, voter_nin_hash, details, ...
) VALUES ('vote_cast', ?, ?, ...);
```

## Performance Optimization

### 1. Indexing Strategy
- **Primary Keys:** UUID v4 for distributed generation
- **Composite Indexes:** Multi-column indexes for common query patterns
- **Partial Indexes:** Filtered indexes for active/verified records
- **Hash Indexes:** For exact match queries on hashed fields

### 2. Query Optimization
```sql
-- Optimized voter lookup
SELECT id, first_name, last_name, biometric_hash
FROM voters 
WHERE nin_hash = ? AND is_active = TRUE AND is_verified = TRUE
LIMIT 1;

-- Optimized election results
SELECT c.name, c.party, COUNT(v.id) as vote_count
FROM candidates c
LEFT JOIN votes v ON c.id = v.candidate_id
WHERE c.election_id = ?
GROUP BY c.id, c.name, c.party
ORDER BY vote_count DESC;
```

### 3. Data Archival Strategy
```sql
-- Archive old audit logs (older than 7 years)
CREATE TABLE audit_logs_archive AS
SELECT * FROM audit_logs 
WHERE timestamp < DATE_SUB(NOW(), INTERVAL 7 YEAR);

-- Clean up archived records
DELETE FROM audit_logs 
WHERE timestamp < DATE_SUB(NOW(), INTERVAL 7 YEAR);
```

## Backup and Recovery

### 1. Backup Strategy
- **Full Backup:** Daily encrypted backups of entire database
- **Incremental Backup:** Hourly backups of changed data
- **Transaction Log Backup:** Continuous transaction log shipping
- **Cross-Region Replication:** Real-time replication to secondary region

### 2. Recovery Procedures
```bash
# Point-in-time recovery
mysql --single-transaction --routines --triggers \
      --all-databases > backup_$(date +%Y%m%d_%H%M%S).sql

# Encrypted backup
gpg --cipher-algo AES256 --compress-algo 1 --s2k-mode 3 \
    --s2k-digest-algo SHA512 --s2k-count 65536 --symmetric \
    backup.sql
```

### 3. Data Integrity Verification
```sql
-- Verify voter hash chain
SELECT v1.id, v1.current_hash, v2.previous_hash
FROM voters v1
JOIN voters v2 ON v1.current_hash = v2.previous_hash
WHERE v1.current_hash != SHA2(CONCAT(v1.id, v1.nin_encrypted, v1.registration_date, v1.previous_hash), 256);

-- Verify audit log chain
SELECT a1.id, a1.current_hash, a2.previous_hash
FROM audit_logs a1
JOIN audit_logs a2 ON a1.current_hash = a2.previous_hash
WHERE a1.current_hash != SHA2(CONCAT(a1.id, a1.timestamp, a1.event_type, a1.details, a1.previous_hash), 256);
```

## Compliance and Auditing

### 1. NDPR Compliance
- **Data Minimization:** Only collect necessary data
- **Consent Management:** Explicit consent recording with versioning
- **Right to Erasure:** Automated data deletion procedures
- **Data Portability:** Export functionality for voter data
- **Breach Notification:** Automated breach detection and reporting

### 2. Audit Requirements
- **Complete Audit Trail:** Every database operation logged
- **Tamper Evidence:** Cryptographic proof of data integrity
- **Access Logging:** All data access attempts recorded
- **Change Tracking:** Before/after values for all updates

### 3. Retention Policies
```sql
-- Data retention configuration
INSERT INTO system_config (config_key, config_value, description) VALUES
('voter_data_retention_years', '10', 'Voter registration data retention period'),
('audit_log_retention_years', '7', 'Audit log retention period'),
('vote_data_retention_years', '20', 'Vote record retention period'),
('biometric_data_retention_years', '5', 'Biometric data retention period');
```

This comprehensive database design ensures data integrity, security, and compliance while providing the performance needed for a national-scale electronic voting system.