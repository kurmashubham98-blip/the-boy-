-- Run this in the 'test' database provided by TiDB
-- Users Table
CREATE TABLE IF NOT EXISTS users (
    id VARCHAR(255) PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    role ENUM('ADMIN', 'BOY', 'PENDING', 'REJECTED') DEFAULT 'PENDING',
    points INT DEFAULT 0,
    level INT DEFAULT 1,
    joined_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    device_details TEXT
);

-- Tasks Table
CREATE TABLE IF NOT EXISTS tasks (
    id VARCHAR(255) PRIMARY KEY,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    points INT DEFAULT 0,
    type ENUM('WEEKLY', 'LONG_TERM', 'SUB_GOAL') DEFAULT 'WEEKLY',
    category ENUM('STUDY', 'FITNESS', 'CODING', 'OTHER') DEFAULT 'OTHER',
    created_by VARCHAR(255),
    is_group_task BOOLEAN DEFAULT FALSE,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    expires_at DATETIME,
    FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL
);

-- Task Completions (Many-to-Many User-Task)
CREATE TABLE IF NOT EXISTS task_completions (
    task_id VARCHAR(255),
    user_id VARCHAR(255),
    completed_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (task_id, user_id),
    FOREIGN KEY (task_id) REFERENCES tasks(id) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Questions Table
CREATE TABLE IF NOT EXISTS questions (
    id VARCHAR(255) PRIMARY KEY,
    author_id VARCHAR(255),
    title VARCHAR(255) NOT NULL,
    content TEXT,
    is_interest_check BOOLEAN DEFAULT TRUE,
    dropped BOOLEAN DEFAULT FALSE,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (author_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Question Votes
CREATE TABLE IF NOT EXISTS question_votes (
    question_id VARCHAR(255),
    user_id VARCHAR(255),
    vote_type ENUM('UP', 'DOWN'),
    PRIMARY KEY (question_id, user_id),
    FOREIGN KEY (question_id) REFERENCES questions(id) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Solutions Table
CREATE TABLE IF NOT EXISTS solutions (
    id VARCHAR(255) PRIMARY KEY,
    question_id VARCHAR(255),
    author_id VARCHAR(255),
    content TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (question_id) REFERENCES questions(id) ON DELETE CASCADE,
    FOREIGN KEY (author_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Solution Votes
CREATE TABLE IF NOT EXISTS solution_votes (
    solution_id VARCHAR(255),
    user_id VARCHAR(255),
    PRIMARY KEY (solution_id, user_id),
    FOREIGN KEY (solution_id) REFERENCES solutions(id) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);
