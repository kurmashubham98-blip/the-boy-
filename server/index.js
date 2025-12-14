import express from 'express';
import mysql from 'mysql2/promise';
import cors from 'cors';
import dotenv from 'dotenv';
import path from 'path';

// Load .env from the server directory
dotenv.config({ path: './server/.env' });

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors({
    origin: '*', // Allow Vercel app to talk to Render
    methods: ['GET', 'POST', 'PUT', 'DELETE'],
    allowedHeaders: ['Content-Type', 'Authorization']
}));
app.use(express.json({ limit: '10mb' })); // Increased limit for Base64 Images

// Database Connection
const pool = mysql.createPool({
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'the_boys_db',
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0,
    ssl: {
        rejectUnauthorized: false // Required for TiDB Cloud Serverless
    }
});

// Helper to check DB connection and Init Schema
pool.getConnection()
    .then(async conn => {
        console.log("✅ Database connected successfully");
        await initDB(conn);
        conn.release();
    })
    .catch(err => {
        console.error("❌ Database connection failed:", err.message);
    });

async function initDB(conn) {
    console.log("⚙️ Initializing Database Schema...");
    try {
        // Users Table
        await conn.query(`
            CREATE TABLE IF NOT EXISTS users (
                id VARCHAR(255) PRIMARY KEY,
                name VARCHAR(255) NOT NULL,
                role ENUM('ADMIN', 'BOY', 'PENDING', 'REJECTED') DEFAULT 'PENDING',
                points INT DEFAULT 0,
                level INT DEFAULT 1,
                joined_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                device_details TEXT,
                avatar LONGTEXT,
                custom_tags TEXT
            )
        `);

        // Migrations (Idempotent) - Add columns if they don't exist
        try { await conn.query("ALTER TABLE users ADD COLUMN avatar LONGTEXT"); } catch (e) { /* ignore if exists */ }
        try { await conn.query("ALTER TABLE users ADD COLUMN custom_tags TEXT"); } catch (e) { /* ignore if exists */ }

        // Tasks Table
        await conn.query(`
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
            )
        `);

        // Task Completions
        await conn.query(`
            CREATE TABLE IF NOT EXISTS task_completions (
                task_id VARCHAR(255),
                user_id VARCHAR(255),
                completed_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                PRIMARY KEY (task_id, user_id),
                FOREIGN KEY (task_id) REFERENCES tasks(id) ON DELETE CASCADE,
                FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
            )
        `);

        // Questions Table
        await conn.query(`
            CREATE TABLE IF NOT EXISTS questions (
                id VARCHAR(255) PRIMARY KEY,
                author_id VARCHAR(255),
                title VARCHAR(255) NOT NULL,
                content TEXT,
                is_interest_check BOOLEAN DEFAULT TRUE,
                dropped BOOLEAN DEFAULT FALSE,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (author_id) REFERENCES users(id) ON DELETE CASCADE
            )
        `);

        // Question Votes
        await conn.query(`
            CREATE TABLE IF NOT EXISTS question_votes (
                question_id VARCHAR(255),
                user_id VARCHAR(255),
                vote_type ENUM('UP', 'DOWN'),
                PRIMARY KEY (question_id, user_id),
                FOREIGN KEY (question_id) REFERENCES questions(id) ON DELETE CASCADE,
                FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
            )
        `);

        // Solutions Table
        await conn.query(`
            CREATE TABLE IF NOT EXISTS solutions (
                id VARCHAR(255) PRIMARY KEY,
                question_id VARCHAR(255),
                author_id VARCHAR(255),
                content TEXT,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (question_id) REFERENCES questions(id) ON DELETE CASCADE,
                FOREIGN KEY (author_id) REFERENCES users(id) ON DELETE CASCADE
            )
        `);

        // Solution Votes
        await conn.query(`
            CREATE TABLE IF NOT EXISTS solution_votes (
                solution_id VARCHAR(255),
                user_id VARCHAR(255),
                PRIMARY KEY (solution_id, user_id),
                FOREIGN KEY (solution_id) REFERENCES solutions(id) ON DELETE CASCADE,
                FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
            )
        `);

        // Bounties Table
        await conn.query(`
            CREATE TABLE IF NOT EXISTS bounties (
                id VARCHAR(255) PRIMARY KEY,
                title VARCHAR(255) NOT NULL,
                description TEXT,
                reward INT DEFAULT 0,
                status ENUM('OPEN', 'CLOSED') DEFAULT 'OPEN',
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP
            )
        `);

        // Bounty Submissions Table
        await conn.query(`
            CREATE TABLE IF NOT EXISTS bounty_submissions (
                id VARCHAR(255) PRIMARY KEY,
                bounty_id VARCHAR(255),
                user_id VARCHAR(255),
                proof LONGTEXT,
                status ENUM('PENDING', 'APPROVED', 'REJECTED') DEFAULT 'PENDING',
                feedback TEXT,
                submitted_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (bounty_id) REFERENCES bounties(id) ON DELETE CASCADE,
                FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
            )
        `);

        // MIGRATION: 2025-12-14 - Council Rewards
        try {
            await conn.query(`ALTER TABLE questions ADD COLUMN admin_approved BOOLEAN DEFAULT FALSE`);
        } catch (e) { /* Ignore if exists */ }
        try {
            await conn.query(`ALTER TABLE questions ADD COLUMN majority_approved BOOLEAN DEFAULT FALSE`);
        } catch (e) { /* Ignore if exists */ }
        try {
            await conn.query(`ALTER TABLE solutions ADD COLUMN is_best_answer BOOLEAN DEFAULT FALSE`);
        } catch (e) { /* Ignore if exists */ }

        console.log("✅ Schema initialized");
    } catch (err) {
        console.error("❌ Schema initialization failed:", err);
    }
}

// --- ROUTES ---

// USERS
app.get('/api/users', async (req, res) => {
    try {
        const [rows] = await pool.query('SELECT * FROM users');
        // Map snake_case to camelCase
        const users = rows.map(u => ({
            id: u.id,
            name: u.name,
            role: u.role,
            points: u.points,
            level: u.level,
            joinedAt: u.joined_at,
            deviceDetails: u.device_details,
            avatar: u.avatar,
            customTags: u.custom_tags ? JSON.parse(u.custom_tags) : []
        }));
        res.json(users);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: err.message });
    }
});

app.post('/api/users', async (req, res) => {
    const { id, name, role, points, level, joinedAt, deviceDetails, avatar, customTags } = req.body;
    try {
        // Upsert logic (Insert or Update)
        await pool.query(
            `INSERT INTO users (id, name, role, points, level, joined_at, device_details, avatar, custom_tags) 
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
             ON DUPLICATE KEY UPDATE 
             name=VALUES(name), role=VALUES(role), points=VALUES(points), level=VALUES(level), device_details=VALUES(device_details), avatar=VALUES(avatar), custom_tags=VALUES(custom_tags)`,
            [id, name, role, points, level, joinedAt, deviceDetails, avatar, JSON.stringify(customTags || [])]
        );
        res.json({ success: true });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: err.message });
    }
});

app.post('/api/users/batch', async (req, res) => {
    // For syncing array of users (simple implementation)
    // In production, optimized batch insert is better, but this reuses the single route/logic for simplicity
    const users = req.body;
    try {
        const connection = await pool.getConnection();
        await connection.beginTransaction();

        for (const u of users) {
            await connection.query(
                `INSERT INTO users (id, name, role, points, level, joined_at, device_details, avatar, custom_tags) 
                 VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
                 ON DUPLICATE KEY UPDATE 
                 name=VALUES(name), role=VALUES(role), points=VALUES(points), level=VALUES(level), device_details=VALUES(device_details), avatar=VALUES(avatar), custom_tags=VALUES(custom_tags)`,
                [u.id, u.name, u.role, u.points, u.level, u.joinedAt, u.deviceDetails, u.avatar, JSON.stringify(u.customTags || [])]
            );
        }

        await connection.commit();
        connection.release();
        res.json({ success: true });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: err.message });
    }
});

// TASKS
app.get('/api/tasks', async (req, res) => {
    try {
        const [tasks] = await pool.query('SELECT * FROM tasks ORDER BY created_at DESC');
        const [completions] = await pool.query('SELECT * FROM task_completions');

        const result = tasks.map(t => ({
            id: t.id,
            title: t.title,
            description: t.description,
            points: t.points,
            type: t.type,
            category: t.category,
            createdBy: t.created_by,
            isGroupTask: !!t.is_group_task,
            createdAt: t.created_at,
            expiresAt: t.expires_at,
            completedBy: completions
                .filter(c => c.task_id === t.id)
                .map(c => c.user_id)
        }));
        res.json(result);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: err.message });
    }
});

app.post('/api/tasks', async (req, res) => {
    const tasks = Array.isArray(req.body) ? req.body : [req.body];
    try {
        const connection = await pool.getConnection();
        await connection.beginTransaction();

        for (const t of tasks) {
            // Check if task exists to update or insert
            // Simplification: We just want to ensure the task exists. 
            // The frontend logic mostly "creates" or "claims" (which drives completion).
            // Here we handle Task Definition upsert.

            // 1. Upsert Task
            const toMysqlDate = (isoStr) => isoStr ? new Date(isoStr).toISOString().slice(0, 19).replace('T', ' ') : null;

            await connection.query(
                `INSERT INTO tasks (id, title, description, points, type, category, created_by, is_group_task, created_at, expires_at)
                 VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                 ON DUPLICATE KEY UPDATE title=VALUES(title), points=VALUES(points)`,
                [
                    t.id,
                    t.title,
                    t.description,
                    t.points,
                    t.type,
                    t.category,
                    t.createdBy,
                    t.isGroupTask ? 1 : 0,
                    toMysqlDate(t.createdAt),
                    toMysqlDate(t.expiresAt)
                ]
            );

            // 2. Handle Completions (Syncing complete list is crude but effective for this migration)
            // Ideally: separate endpoint for claiming. But storageService.saveTasks sends IT ALL.
            if (t.completedBy && t.completedBy.length > 0) {
                // Delete old completions and re-insert is safest for "sync" style
                // Ideally we'd optimize this.
                await connection.query('DELETE FROM task_completions WHERE task_id = ?', [t.id]);
                for (const userId of t.completedBy) {
                    await connection.query('INSERT IGNORE INTO task_completions (task_id, user_id) VALUES (?, ?)', [t.id, userId]);
                }
            }
        }

        await connection.commit();
        connection.release();
        res.json({ success: true });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: err.message });
    }
});

// QUESTIONS
app.get('/api/questions', async (req, res) => {
    try {
        const [questions] = await pool.query('SELECT * FROM questions ORDER BY created_at DESC');
        const [qVotes] = await pool.query('SELECT * FROM question_votes');
        const [solutions] = await pool.query('SELECT * FROM solutions');
        const [sVotes] = await pool.query('SELECT * FROM solution_votes');

        const result = questions.map(q => ({
            id: q.id,
            authorId: q.author_id,
            title: q.title,
            content: q.content,
            isInterestCheck: !!q.is_interest_check,
            dropped: !!q.dropped,
            adminApproved: !!q.admin_approved,
            majorityApproved: !!q.majority_approved,
            createdAt: q.created_at,
            upvotes: qVotes.filter(v => v.question_id === q.id && v.vote_type === 'UP').map(v => v.user_id),
            downvotes: qVotes.filter(v => v.question_id === q.id && v.vote_type === 'DOWN').map(v => v.user_id),
            solutions: solutions.filter(s => s.question_id === q.id).map(s => ({
                id: s.id,
                authorId: s.author_id,
                content: s.content,
                isBestAnswer: !!s.is_best_answer,
                votes: sVotes.filter(sv => sv.solution_id === s.id).map(sv => sv.user_id)
            }))
        }));

        res.json(result);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: err.message });
    }
});

app.post('/api/questions', async (req, res) => {
    // Handling Sync style again
    const questions = Array.isArray(req.body) ? req.body : [req.body];
    try {
        const connection = await pool.getConnection();
        await connection.beginTransaction();

        for (const q of questions) {
            await connection.query(
                `INSERT INTO questions (id, author_id, title, content, is_interest_check, dropped, admin_approved, majority_approved, created_at)
                 VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
                 ON DUPLICATE KEY UPDATE 
                 is_interest_check=VALUES(is_interest_check), dropped=VALUES(dropped), admin_approved=VALUES(admin_approved), majority_approved=VALUES(majority_approved)`,
                [q.id, q.authorId, q.title, q.content, q.isInterestCheck, q.dropped, q.adminApproved || false, q.majorityApproved || false, q.createdAt]
            );

            // Sync Votes
            await connection.query('DELETE FROM question_votes WHERE question_id = ?', [q.id]);
            for (const uid of q.upvotes) connection.query('INSERT INTO question_votes VALUES (?, ?, ?)', [q.id, uid, 'UP']);
            for (const uid of q.downvotes) connection.query('INSERT INTO question_votes VALUES (?, ?, ?)', [q.id, uid, 'DOWN']);

            // Sync Solutions
            for (const s of q.solutions) {
                await connection.query(
                    `INSERT INTO solutions (id, question_id, author_id, content, is_best_answer) VALUES (?, ?, ?, ?, ?) 
                     ON DUPLICATE KEY UPDATE content=content, is_best_answer=VALUES(is_best_answer)`,
                    [s.id, q.id, s.authorId, s.content, s.isBestAnswer || false]
                );
                // Sync Solution Votes
                await connection.query('DELETE FROM solution_votes WHERE solution_id = ?', [s.id]);
                for (const uid of s.votes) connection.query('INSERT INTO solution_votes VALUES (?, ?)', [s.id, uid]);
            }
        }

        await connection.commit();
        connection.release();
        res.json({ success: true });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: err.message });
    }
});


// BOUNTIES
app.get('/api/bounties', async (req, res) => {
    try {
        const [bounties] = await pool.query('SELECT * FROM bounties ORDER BY created_at DESC');

        // Return bounties
        const result = bounties.map(b => ({
            id: b.id,
            title: b.title,
            description: b.description,
            reward: b.reward,
            status: b.status,
            createdAt: b.created_at
        }));
        res.json(result);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: err.message });
    }
});

app.post('/api/bounties', async (req, res) => {
    const { id, title, description, reward } = req.body;
    try {
        await pool.query(
            'INSERT INTO bounties (id, title, description, reward) VALUES (?, ?, ?, ?)',
            [id, title, description, reward]
        );
        res.json({ success: true });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: err.message });
    }
});

// SUBMISSIONS
app.get('/api/bounties/submissions', async (req, res) => {
    try {
        // Return ALL submissions for Admin
        const [rows] = await pool.query('SELECT * FROM bounty_submissions ORDER BY submitted_at DESC');
        const submissions = rows.map(s => ({
            id: s.id,
            bountyId: s.bounty_id,
            userId: s.user_id,
            proof: s.proof,
            status: s.status,
            feedback: s.feedback,
            submittedAt: s.submitted_at
        }));
        res.json(submissions);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: err.message });
    }
});

app.post('/api/bounties/submit', async (req, res) => {
    const { id, bountyId, userId, proof } = req.body;
    try {
        await pool.query(
            'INSERT INTO bounty_submissions (id, bounty_id, user_id, proof) VALUES (?, ?, ?, ?)',
            [id, bountyId, userId, proof]
        );
        res.json({ success: true });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: err.message });
    }
});

app.post('/api/bounties/verify', async (req, res) => {
    const { submissionId, status, feedback, bountyId, userId, reward } = req.body;
    try {
        const connection = await pool.getConnection();
        await connection.beginTransaction();

        // Update Submission Status
        await connection.query(
            'UPDATE bounty_submissions SET status = ?, feedback = ? WHERE id = ?',
            [status, feedback || '', submissionId]
        );

        // If Approved, Award XP
        if (status === 'APPROVED') {
            await connection.query(
                'UPDATE users SET points = points + ? WHERE id = ?',
                [reward, userId]
            );
        }

        await connection.commit();
        connection.release();
        res.json({ success: true });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: err.message });
    }
});

app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
