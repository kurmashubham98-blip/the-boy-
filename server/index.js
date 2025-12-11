import express from 'express';
import mysql from 'mysql2/promise';
import cors from 'cors';
import dotenv from 'dotenv';
import path from 'path';

// Load .env from the server directory
dotenv.config({ path: './server/.env' });

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());

// Database Connection
const pool = mysql.createPool({
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'the_boys_db',
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0
});

// Helper to check DB connection
pool.getConnection()
    .then(conn => {
        console.log("✅ Database connected successfully");
        conn.release();
    })
    .catch(err => {
        console.error("❌ Database connection failed:", err.message);
    });

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
            deviceDetails: u.device_details
        }));
        res.json(users);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: err.message });
    }
});

app.post('/api/users', async (req, res) => {
    const { id, name, role, points, level, joinedAt, deviceDetails } = req.body;
    try {
        // Upsert logic (Insert or Update)
        await pool.query(
            `INSERT INTO users (id, name, role, points, level, joined_at, device_details) 
             VALUES (?, ?, ?, ?, ?, ?, ?)
             ON DUPLICATE KEY UPDATE 
             name=VALUES(name), role=VALUES(role), points=VALUES(points), level=VALUES(level), device_details=VALUES(device_details)`,
            [id, name, role, points, level, joinedAt, deviceDetails]
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
                `INSERT INTO users (id, name, role, points, level, joined_at, device_details) 
                 VALUES (?, ?, ?, ?, ?, ?, ?)
                 ON DUPLICATE KEY UPDATE 
                 name=VALUES(name), role=VALUES(role), points=VALUES(points), level=VALUES(level), device_details=VALUES(device_details)`,
                [u.id, u.name, u.role, u.points, u.level, u.joinedAt, u.deviceDetails]
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
            await connection.query(
                `INSERT INTO tasks (id, title, description, points, type, category, created_by, is_group_task, created_at, expires_at)
                 VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                 ON DUPLICATE KEY UPDATE title=VALUES(title), points=VALUES(points)`,
                [t.id, t.title, t.description, t.points, t.type, t.category, t.createdBy, t.isGroupTask, t.createdAt, t.expiresAt]
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
            createdAt: q.created_at,
            upvotes: qVotes.filter(v => v.question_id === q.id && v.vote_type === 'UP').map(v => v.user_id),
            downvotes: qVotes.filter(v => v.question_id === q.id && v.vote_type === 'DOWN').map(v => v.user_id),
            solutions: solutions.filter(s => s.question_id === q.id).map(s => ({
                id: s.id,
                authorId: s.author_id,
                content: s.content,
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
                `INSERT INTO questions (id, author_id, title, content, is_interest_check, dropped, created_at)
                 VALUES (?, ?, ?, ?, ?, ?, ?)
                 ON DUPLICATE KEY UPDATE 
                 is_interest_check=VALUES(is_interest_check), dropped=VALUES(dropped)`,
                [q.id, q.authorId, q.title, q.content, q.isInterestCheck, q.dropped, q.createdAt]
            );

            // Sync Votes
            await connection.query('DELETE FROM question_votes WHERE question_id = ?', [q.id]);
            for (const uid of q.upvotes) connection.query('INSERT INTO question_votes VALUES (?, ?, ?)', [q.id, uid, 'UP']);
            for (const uid of q.downvotes) connection.query('INSERT INTO question_votes VALUES (?, ?, ?)', [q.id, uid, 'DOWN']);

            // Sync Solutions
            for (const s of q.solutions) {
                await connection.query(
                    `INSERT INTO solutions (id, question_id, author_id, content) VALUES (?, ?, ?, ?) ON DUPLICATE KEY UPDATE content=content`,
                    [s.id, q.id, s.authorId, s.content]
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


app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
