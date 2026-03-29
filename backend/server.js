require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const pool = require('./db');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;
const JWT_SECRET = process.env.JWT_SECRET || 'please-change-this-in-production';

app.use(helmet());
app.use(cors());
app.use(express.json());


// Basic health
app.get('/api/health', (req, res) => res.json({ ok: true }));

// DB connectivity check (helpful for debugging when DATABASE_URL is not set)
app.get('/api/db-check', async (req, res) => {
  try {
    const r = await pool.query('SELECT 1 as ok');
    if (r && r.rows && r.rows[0] && r.rows[0].ok === 1) return res.json({ ok: true });
    return res.status(500).json({ ok: false, error: 'unexpected response' });
  } catch (err) {
    console.error('DB check failed', err);
    return res.status(500).json({ ok: false, error: err.message });
  }
});

// Register endpoint
app.post('/api/register', async (req, res) => {
  try {
    // Log incoming register attempts (avoid logging passwords)
    const src = req.ip || req.headers['x-forwarded-for'] || req.connection && req.connection.remoteAddress;
    const preview = { email: req.body && req.body.email, username: req.body && req.body.username, dob: req.body && req.body.dob };
    console.info('Register attempt from', src, preview);
    const { fullName, email, username, password, dob, country } = req.body || {};
    if(!fullName || !email || !username || !password) {
      return res.status(400).json({ error: 'Missing required fields.' });
    }

    if(password.length < 8) return res.status(400).json({ error: 'Password too short (min 8 characters).' });

    // check for existing email or username
    const existsQ = 'SELECT id FROM users WHERE email = $1 OR username = $2 LIMIT 1';
    const existsRes = await pool.query(existsQ, [email, username]);
    if(existsRes.rows.length) return res.status(409).json({ error: 'Email or username already in use.' });

    const hash = await bcrypt.hash(password, 10);
    const insertQ = `INSERT INTO users (full_name, email, username, password_hash, dob, country)
                     VALUES ($1,$2,$3,$4,$5,$6) RETURNING id, full_name, email, username, dob, country, created_at`;
    const insertRes = await pool.query(insertQ, [fullName, email, username, hash, dob || null, country || null]);
    const user = insertRes.rows[0];

    // create a JWT
    const token = jwt.sign({ userId: user.id }, JWT_SECRET, { expiresIn: '7d' });

    res.status(201).json({ user, token });
  } catch (err) {
    console.error('Register error', err);
    if (process.env.NODE_ENV === 'production') {
      res.status(500).json({ error: 'Internal server error' });
    } else {
      res.status(500).json({ error: err.message || 'Internal server error', stack: err.stack });
    }
  }
});

// Login endpoint
app.post('/api/login', async (req, res) => {
  try {
    const { identifier, password } = req.body || {};
    if(!identifier || !password) return res.status(400).json({ error: 'Missing credentials.' });

    // identifier can be email or username
    const q = 'SELECT id, full_name, email, username, password_hash FROM users WHERE email = $1 OR username = $1 LIMIT 1';
    const r = await pool.query(q, [identifier]);
    if(!r.rows.length) return res.status(401).json({ error: 'Invalid credentials.' });

    const user = r.rows[0];
    const ok = await bcrypt.compare(password, user.password_hash);
    if(!ok) return res.status(401).json({ error: 'Invalid credentials.' });

    const token = jwt.sign({ userId: user.id }, JWT_SECRET, { expiresIn: '7d' });
    // return user meta (excluding password)
    res.json({ user: { id: user.id, full_name: user.full_name, email: user.email, username: user.username }, token });
  } catch (err) {
    console.error('Login error', err);
    if (process.env.NODE_ENV === 'production') {
      res.status(500).json({ error: 'Internal server error' });
    } else {
      res.status(500).json({ error: err.message || 'Internal server error', stack: err.stack });
    }
  }
});

// simple auth middleware for /api/me
function authMiddleware(req, res, next){
  const auth = req.headers.authorization || '';
  const m = auth.match(/^Bearer (.+)$/);
  if(!m) return res.status(401).json({ error: 'Missing token.' });
  const token = m[1];
  try{
    const payload = jwt.verify(token, JWT_SECRET);
    req.userId = payload.userId; next();
  }catch(err){
    return res.status(401).json({ error: 'Invalid token.' });
  }
}

app.get('/api/me', authMiddleware, async (req, res) => {
  try{
    const q = 'SELECT id, full_name, email, username, dob, country, created_at FROM users WHERE id = $1 LIMIT 1';
    const r = await pool.query(q, [req.userId]);
    if(!r.rows.length) return res.status(404).json({ error: 'User not found.' });
    res.json({ user: r.rows[0] });
  }catch(err){
    console.error(err); res.status(500).json({ error: 'Internal server error' });
  }
});

// Serve frontend static files from project root so index.html/login.html work from the same origin.
const publicPath = path.join(__dirname, '..');
app.use(express.static(publicPath));

app.get('/', (req, res) => {
  // Serve the registration page at the root for clarity
  res.sendFile(path.join(publicPath, 'registration.html'));
});

app.listen(PORT, ()=>{
  console.log(`Vibe backend listening on http://localhost:${PORT}`);
});
