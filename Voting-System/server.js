const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const cors = require('cors');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static('public'));

// Database setup
const db = new sqlite3.Database('./voting_system.db');

// Initialize database tables
db.serialize(() => {
    // Candidates table
    db.run(`CREATE TABLE IF NOT EXISTS candidates (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        position INTEGER NOT NULL UNIQUE,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )`);

    // Votes table
    db.run(`CREATE TABLE IF NOT EXISTS votes (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        voter_name TEXT NOT NULL,
        candidate_id INTEGER,
        timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (candidate_id) REFERENCES candidates (id)
    )`);

    // Settings table for system configuration
    db.run(`CREATE TABLE IF NOT EXISTS settings (
        key TEXT PRIMARY KEY,
        value TEXT NOT NULL,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )`);

    // Insert default candidates if none exist
    db.get("SELECT COUNT(*) as count FROM candidates", (err, row) => {
        if (row.count === 0) {
            const defaultCandidates = [
                { name: "Alice Johnson", position: 1 },
                { name: "Bob Smith", position: 2 },
                { name: "Carol Wilson", position: 3 },
                { name: "David Brown", position: 4 }
            ];

            const stmt = db.prepare("INSERT INTO candidates (name, position) VALUES (?, ?)");
            defaultCandidates.forEach(candidate => {
                stmt.run(candidate.name, candidate.position);
            });
            stmt.finalize();
        }
    });

    // Initialize settings
    db.run("INSERT OR IGNORE INTO settings (key, value) VALUES ('results_published', 'false')");
    db.run("INSERT OR IGNORE INTO settings (key, value) VALUES ('winner_announced', 'false')");
});

// API Routes

// Get all candidates
app.get('/api/candidates', (req, res) => {
    db.all("SELECT * FROM candidates ORDER BY position", (err, rows) => {
        if (err) {
            res.status(500).json({ error: err.message });
            return;
        }
        res.json({ candidates: rows });
    });
});

// Add new candidate
app.post('/api/candidates', (req, res) => {
    const { name } = req.body;
    
    if (!name || name.trim().length === 0) {
        res.status(400).json({ error: 'Candidate name is required' });
        return;
    }

    // Get the next available position
    db.get("SELECT MAX(position) as maxPos FROM candidates", (err, row) => {
        if (err) {
            res.status(500).json({ error: err.message });
            return;
        }

        const nextPosition = (row.maxPos || 0) + 1;
        
        db.run("INSERT INTO candidates (name, position) VALUES (?, ?)", 
               [name.trim(), nextPosition], 
               function(err) {
            if (err) {
                res.status(500).json({ error: err.message });
                return;
            }
            res.json({ 
                id: this.lastID, 
                name: name.trim(), 
                position: nextPosition,
                message: 'Candidate added successfully' 
            });
        });
    });
});

// Update candidate
app.put('/api/candidates/:id', (req, res) => {
    const { name } = req.body;
    const candidateId = req.params.id;

    if (!name || name.trim().length === 0) {
        res.status(400).json({ error: 'Candidate name is required' });
        return;
    }

    db.run("UPDATE candidates SET name = ? WHERE id = ?", 
           [name.trim(), candidateId], 
           function(err) {
        if (err) {
            res.status(500).json({ error: err.message });
            return;
        }
        if (this.changes === 0) {
            res.status(404).json({ error: 'Candidate not found' });
            return;
        }
        res.json({ message: 'Candidate updated successfully' });
    });
});

// Delete candidate
app.delete('/api/candidates/:id', (req, res) => {
    const candidateId = req.params.id;

    // Check if candidate has votes
    db.get("SELECT COUNT(*) as voteCount FROM votes WHERE candidate_id = ?", 
           [candidateId], (err, row) => {
        if (err) {
            res.status(500).json({ error: err.message });
            return;
        }

        if (row.voteCount > 0) {
            res.status(400).json({ 
                error: 'Cannot delete candidate with existing votes. Reset votes first.' 
            });
            return;
        }

        db.run("DELETE FROM candidates WHERE id = ?", [candidateId], function(err) {
            if (err) {
                res.status(500).json({ error: err.message });
                return;
            }
            if (this.changes === 0) {
                res.status(404).json({ error: 'Candidate not found' });
                return;
            }

            // Reorder positions after deletion
            db.run(`UPDATE candidates 
                    SET position = position - 1 
                    WHERE position > (
                        SELECT position FROM candidates WHERE id = ?
                    )`, [candidateId]);

            res.json({ message: 'Candidate deleted successfully' });
        });
    });
});

// Cast vote
app.post('/api/votes', (req, res) => {
    const { voterName, candidateId } = req.body;

    if (!voterName || !candidateId) {
        res.status(400).json({ error: 'Voter name and candidate ID are required' });
        return;
    }

    // Check if voter has already voted
    db.get("SELECT id FROM votes WHERE LOWER(voter_name) = LOWER(?)", 
           [voterName.trim()], (err, row) => {
        if (err) {
            res.status(500).json({ error: err.message });
            return;
        }

        if (row) {
            res.status(400).json({ error: 'You have already voted!' });
            return;
        }

        // Verify candidate exists
        db.get("SELECT id FROM candidates WHERE id = ?", [candidateId], (err, candidate) => {
            if (err) {
                res.status(500).json({ error: err.message });
                return;
            }

            if (!candidate) {
                res.status(404).json({ error: 'Candidate not found' });
                return;
            }

            // Cast the vote
            db.run("INSERT INTO votes (voter_name, candidate_id) VALUES (?, ?)", 
                   [voterName.trim(), candidateId], 
                   function(err) {
                if (err) {
                    res.status(500).json({ error: err.message });
                    return;
                }
                res.json({ 
                    id: this.lastID, 
                    message: 'Vote cast successfully' 
                });
            });
        });
    });
});

// Get voting results
app.get('/api/results', (req, res) => {
    const query = `
        SELECT 
            c.id,
            c.name,
            c.position,
            COUNT(v.id) as vote_count
        FROM candidates c
        LEFT JOIN votes v ON c.id = v.candidate_id
        GROUP BY c.id, c.name, c.position
        ORDER BY c.position
    `;

    db.all(query, (err, rows) => {
        if (err) {
            res.status(500).json({ error: err.message });
            return;
        }

        const totalVotes = rows.reduce((sum, candidate) => sum + candidate.vote_count, 0);
        
        const results = rows.map(candidate => ({
            ...candidate,
            percentage: totalVotes > 0 ? ((candidate.vote_count / totalVotes) * 100).toFixed(1) : 0
        }));

        // Find winner
        const maxVotes = Math.max(...results.map(r => r.vote_count));
        const winners = results.filter(r => r.vote_count === maxVotes && maxVotes > 0);
        
        res.json({
            results,
            totalVotes,
            winner: winners.length === 1 ? winners[0] : null,
            tie: winners.length > 1 && maxVotes > 0
        });
    });
});

// Get voters list
app.get('/api/voters', (req, res) => {
    const query = `
        SELECT 
            v.voter_name,
            c.name as candidate_name,
            v.timestamp
        FROM votes v
        JOIN candidates c ON v.candidate_id = c.id
        ORDER BY v.timestamp DESC
    `;

    db.all(query, (err, rows) => {
        if (err) {
            res.status(500).json({ error: err.message });
            return;
        }
        res.json({ voters: rows });
    });
});

// Check if voter has already voted
app.get('/api/voters/:name/check', (req, res) => {
    const voterName = req.params.name;
    
    db.get("SELECT id FROM votes WHERE LOWER(voter_name) = LOWER(?)", 
           [voterName], (err, row) => {
        if (err) {
            res.status(500).json({ error: err.message });
            return;
        }
        res.json({ hasVoted: !!row });
    });
});

// Publish/unpublish results
app.post('/api/results/publish', (req, res) => {
    const { publish } = req.body;
    
    db.run("UPDATE settings SET value = ?, updated_at = CURRENT_TIMESTAMP WHERE key = 'results_published'", 
           [publish ? 'true' : 'false'], 
           function(err) {
        if (err) {
            res.status(500).json({ error: err.message });
            return;
        }
        res.json({ 
            message: publish ? 'Results published successfully' : 'Results unpublished successfully',
            published: publish 
        });
    });
});

// Get settings
app.get('/api/settings', (req, res) => {
    db.all("SELECT * FROM settings", (err, rows) => {
        if (err) {
            res.status(500).json({ error: err.message });
            return;
        }
        
        const settings = {};
        rows.forEach(row => {
            settings[row.key] = row.value === 'true' ? true : row.value === 'false' ? false : row.value;
        });
        
        res.json({ settings });
    });
});

// Reset all votes
app.delete('/api/votes', (req, res) => {
    db.run("DELETE FROM votes", function(err) {
        if (err) {
            res.status(500).json({ error: err.message });
            return;
        }
        
        // Also reset published status
        db.run("UPDATE settings SET value = 'false' WHERE key = 'results_published'", (err) => {
            if (err) {
                res.status(500).json({ error: err.message });
                return;
            }
            res.json({ 
                message: 'All votes reset successfully',
                deletedCount: this.changes 
            });
        });
    });
});

// Admin authentication endpoint
app.post('/api/admin/login', (req, res) => {
    const { username, password } = req.body;
    
    // Simple hardcoded admin credentials (in production, use proper authentication)
    if (username === 'admin' && password === 'admin123') {
        res.json({ 
            success: true, 
            message: 'Admin login successful',
            token: 'admin-token' // In production, use JWT tokens
        });
    } else {
        res.status(401).json({ 
            success: false, 
            error: 'Invalid credentials' 
        });
    }
});

// Serve static files
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Error handling middleware
app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(500).json({ error: 'Something went wrong!' });
});

// Start server
app.listen(PORT, () => {
    console.log(`🗳️  Voting System Server running on http://localhost:${PORT}`);
    console.log(`📊 Database: SQLite (voting_system.db)`);
    console.log(`🔑 Admin credentials: admin / admin123`);
});

// Graceful shutdown
process.on('SIGINT', () => {
    console.log('\n🔒 Closing database connection...');
    db.close((err) => {
        if (err) {
            console.error(err.message);
        }
        console.log('✅ Database connection closed.');
        process.exit(0);
    });
});