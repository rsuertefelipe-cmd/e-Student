const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const cors = require('cors');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(express.json());

// Database connection
const dbPath = path.resolve(__dirname, 'database.sqlite');
const db = new sqlite3.Database(dbPath, (err) => {
    if (err) {
        console.error('Error opening database', err.message);
    } else {
        console.log('Connected to the SQLite database.');
        
        // Define Schemas
        db.serialize(() => {
            db.run(`CREATE TABLE IF NOT EXISTS students (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                firstName TEXT NOT NULL,
                lastName TEXT NOT NULL,
                email TEXT UNIQUE NOT NULL,
                enrollmentDate TEXT NOT NULL,
                course TEXT NOT NULL
            )`);

            db.run(`CREATE TABLE IF NOT EXISTS grades (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                studentId INTEGER NOT NULL,
                subject TEXT NOT NULL,
                grade TEXT NOT NULL,
                semester TEXT NOT NULL,
                FOREIGN KEY (studentId) REFERENCES students (id) ON DELETE CASCADE
            )`);

            db.run(`CREATE TABLE IF NOT EXISTS attendance (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                studentId INTEGER NOT NULL,
                date TEXT NOT NULL,
                status TEXT NOT NULL,
                FOREIGN KEY (studentId) REFERENCES students (id) ON DELETE CASCADE
            )`);
        });
    }
});

// --- API Endpoints ---

// 1. Dashboard Stats
app.get('/api/stats', (req, res) => {
    const stats = {};
    db.get('SELECT COUNT(*) as totalStudents FROM students', [], (err, row) => {
        if (err) return res.status(500).json({ error: err.message });
        stats.totalStudents = row.totalStudents;
        
        db.get('SELECT COUNT(*) as totalRecords FROM grades', [], (err, row) => {
             if (err) return res.status(500).json({ error: err.message });
             stats.totalGrades = row.totalRecords;
             
             db.get('SELECT COUNT(*) as totalAttendance FROM attendance', [], (err, row) => {
                 if (err) return res.status(500).json({ error: err.message });
                 stats.totalAttendance = row.totalAttendance;
                 res.json(stats);
             });
        });
    });
});

// 2. Students CRUD
app.get('/api/students', (req, res) => {
    db.all('SELECT * FROM students ORDER BY id DESC', [], (err, rows) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(rows);
    });
});

app.post('/api/students', (req, res) => {
    const { firstName, lastName, email, course } = req.body;
    const enrollmentDate = new Date().toISOString().split('T')[0];
    
    db.run(
        'INSERT INTO students (firstName, lastName, email, enrollmentDate, course) VALUES (?, ?, ?, ?, ?)',
        [firstName, lastName, email, enrollmentDate, course],
        function(err) {
            if (err) return res.status(400).json({ error: err.message });
            res.json({ id: this.lastID, firstName, lastName, email, enrollmentDate, course });
        }
    );
});

app.get('/api/students/:id', (req, res) => {
    db.get('SELECT * FROM students WHERE id = ?', [req.params.id], (err, row) => {
        if (err) return res.status(500).json({ error: err.message });
        if (!row) return res.status(404).json({ error: 'Student not found' });
        res.json(row);
    });
});

app.delete('/api/students/:id', (req, res) => {
    db.run('DELETE FROM students WHERE id = ?', [req.params.id], function(err) {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ deleted: this.changes });
    });
});

// 3. Grades and Attendance
app.get('/api/students/:id/grades', (req, res) => {
    db.all('SELECT * FROM grades WHERE studentId = ? ORDER BY id DESC', [req.params.id], (err, rows) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(rows);
    });
});

app.post('/api/students/:id/grades', (req, res) => {
    const { subject, grade, semester } = req.body;
    db.run(
        'INSERT INTO grades (studentId, subject, grade, semester) VALUES (?, ?, ?, ?)',
        [req.params.id, subject, grade, semester],
        function(err) {
            if (err) return res.status(400).json({ error: err.message });
            res.json({ id: this.lastID, studentId: req.params.id, subject, grade, semester });
        }
    );
});

app.get('/api/students/:id/attendance', (req, res) => {
    db.all('SELECT * FROM attendance WHERE studentId = ? ORDER BY date DESC', [req.params.id], (err, rows) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(rows);
    });
});

app.post('/api/students/:id/attendance', (req, res) => {
    const { date, status } = req.body;
    db.run(
        'INSERT INTO attendance (studentId, date, status) VALUES (?, ?, ?)',
        [req.params.id, date, status],
        function(err) {
            if (err) return res.status(400).json({ error: err.message });
            res.json({ id: this.lastID, studentId: req.params.id, date, status });
        }
    );
});

// Start Server
app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
});
