// ------------------------------------------------------------
// UPLANDS FM – CLEAN PRODUCTION BACKEND (PostgreSQL + Uploads)
// ------------------------------------------------------------
process.env.TZ = "Africa/Nairobi";

import dotenv from 'dotenv';
dotenv.config();

import express from 'express';
import bodyParser from 'body-parser';
import cors from 'cors';
import pkg from 'pg';
import multer from 'multer';
import path from 'path';
import fs from 'fs';

const { Pool } = pkg;
const app = express();

app.use(cors());
app.use(bodyParser.json());

// -----------------------------------------
// DATABASE
// -----------------------------------------
const pool = new Pool({
  connectionString: process.env.DATABASE_URL
});

app.set("db", pool);

// -----------------------------------------
// FILE UPLOADS
// -----------------------------------------
const uploadDir = path.join(process.cwd(), 'uploads');
if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir);

const storage = multer.diskStorage({
  destination: (_, __, cb) => cb(null, uploadDir),
  filename: (_, file, cb) => {
    const ext = path.extname(file.originalname);
    cb(null, Date.now() + ext);
  }
});

const upload = multer({ storage });
app.use('/uploads', express.static(uploadDir));

// -----------------------------------------
// STATIC FALLBACK (if DB fails)
// -----------------------------------------
const fallbackShows = [
  { id:1, title:'Kipindi Maalumu', start_time:'06:00:00', end_time:'10:00:00', days:['mon','tue','wed','thu','fri','sat'], presenters:['Default Presenter'] },
  { id:2, title:'Kipindi Maalumu', start_time:'10:00:00', end_time:'13:00:00', days:['mon','tue','wed','thu','fri'], presenters:['Default Presenter'] }
];

// -----------------------------------------
// ROOT ROUTE
// -----------------------------------------
app.get("/", (_, res) => res.send("Uplands API Running"));

// =============================================================
// SHOWS
// =============================================================
app.get('/api/shows', async (_, res) => {
  try {
    const r = await pool.query(`
      SELECT s.id, s.title, s.start_time, s.end_time, s.days,
        COALESCE(json_agg(p.name) FILTER (WHERE p.name IS NOT NULL),'[]') AS presenters
      FROM shows s
      LEFT JOIN presenters p ON p.show_id = s.id
      GROUP BY s.id
      ORDER BY s.start_time
    `);

    if (r.rows.length) return res.json(r.rows);
  } catch {}

  res.json(fallbackShows);
});

// =============================================================
// SHOWS NOW – SMART LOGIC (No delays, conflict-safe, midnight-safe)
// =============================================================
app.get('/api/shows/now', async (_, res) => {
  try {
    const now = new Date();
    const today = ['sun','mon','tue','wed','thu','fri','sat'][now.getDay()];

    const r = await pool.query(`
      SELECT 
        s.id, s.title, s.start_time, s.end_time, s.days,
        COALESCE(json_agg(p.name) FILTER (WHERE p.name IS NOT NULL),'[]') AS presenters
      FROM shows s
      LEFT JOIN presenters p ON p.show_id = s.id
      GROUP BY s.id
    `);

    const validShows = r.rows
      .filter(s => s.days.includes(today))
      .map(s => {
        const [sh, sm, ss] = s.start_time.split(':').map(Number);
        const [eh, em, es] = s.end_time.split(':').map(Number);

        const start = new Date(now);
        start.setHours(sh, sm, ss, 0);

        const end = new Date(now);
        end.setHours(eh, em, es, 0);

        // midnight crossing fix
        if (end <= start) {
          end.setDate(end.getDate() + 1);
        }

        return { ...s, start, end };
      });

    // choose show that is truly active
    const active = validShows
      .filter(s => now >= s.start && now < s.end)
      .sort((a, b) => b.start - a.start)[0] || null;

    return res.json(active);
  } catch (e) {
    console.log("Error in /api/shows/now:", e);
    return res.json(null);
  }
});

// =============================================================
// CREATE SHOW
// =============================================================
app.post('/api/shows', async (req, res) => {
  const { title, start_time, end_time, days } = req.body;

  try {
    const r = await pool.query(`
      INSERT INTO shows(title,start_time,end_time,days)
      VALUES($1,$2,$3,$4) RETURNING *
    `, [title,start_time,end_time,days]);

    res.json(r.rows[0]);
  } catch {
    res.status(500).json({ error:"Failed to create show" });
  }
});

// =============================================================
// UPDATE SHOW
// =============================================================
app.put('/api/shows/:id', async (req,res) => {
  const { id } = req.params;
  const { title, start_time, end_time, days } = req.body;

  try {
    const r = await pool.query(`
      UPDATE shows 
      SET title=$1,start_time=$2,end_time=$3,days=$4
      WHERE id=$5 RETURNING *
    `, [title,start_time,end_time,days,id]);

    res.json(r.rows[0]);
  } catch {
    res.status(500).json({ error:"Failed to update show" });
  }
});

// =============================================================
// DELETE SHOW
// =============================================================
app.delete('/api/shows/:id', async (req,res) => {
  try {
    await pool.query('DELETE FROM shows WHERE id=$1', [req.params.id]);
    res.json({ success: true });
  } catch {
    res.status(500).json({ error:"Failed to delete show" });
  }
});

// =============================================================
// PRESENTERS
// =============================================================
app.get('/api/presenters', async (_, res) => {
  try {
    const r = await pool.query('SELECT * FROM presenters ORDER BY id');
    res.json(r.rows);
  } catch {
    res.json([]);
  }
});

// Create presenter
app.post('/api/presenters', upload.single("file"), async (req,res) => {
  const { name, show_id, bio } = req.body;
  const photo_url = req.file
    ? `${req.protocol}://${req.get('host')}/uploads/${req.file.filename}`
    : null;

  try {
    const r = await pool.query(`
      INSERT INTO presenters(name,show_id,photo_url,bio)
      VALUES($1,$2,$3,$4) RETURNING *
    `,[name,show_id,photo_url,bio]);

    res.json(r.rows[0]);
  } catch {
    res.status(500).json({ error:"Failed to create presenter" });
  }
});

// Update presenter
app.put('/api/presenters/:id', async (req,res) => {
  const { name, show_id, photo_url, bio } = req.body;
  try {
    const r = await pool.query(`
      UPDATE presenters
      SET name=$1,show_id=$2,photo_url=$3,bio=$4
      WHERE id=$5 RETURNING *
    `,[name,show_id,photo_url,bio,req.params.id]);

    res.json(r.rows[0]);
  } catch {
    res.status(500).json({ error:"Failed to update presenter" });
  }
});

// Delete presenter
app.delete('/api/presenters/:id', async (req,res) => {
  try {
    await pool.query('DELETE FROM presenters WHERE id=$1', [req.params.id]);
    res.json({ success:true });
  } catch {
    res.status(500).json({ error:"Failed to delete presenter" });
  }
});

// =============================================================
// COMMENTS
// =============================================================
let comments = [];

app.post('/api/comments', (req,res) => {
  const { username, message } = req.body;
  if (!message) return res.status(400).json({ error:"Message required" });

  const obj = {
    id: Date.now(),
    username: username || "Guest",
    message,
    created_at: new Date().toISOString(),
    approved: false
  };

  comments.unshift(obj);
  res.json(obj);
});

app.get('/api/comments', (_, res) => res.json(comments));

// Secure delete
app.delete('/api/comments/:id', (req,res) => {
  const key = req.headers['x-admin-key'];
  const ADMIN_KEY = process.env.ADMIN_KEY || "uplands-secret";

  if (key !== ADMIN_KEY)
    return res.status(403).json({ error:"Forbidden" });

  const idx = comments.findIndex(c => c.id == req.params.id);
  if (idx === -1) return res.status(404).json({ error:"Not found" });

  comments.splice(idx,1);
  res.json({ success:true });
});

// =============================================================
// PLAYLIST
// =============================================================
app.get('/api/playlist', (_, res) => {
  res.json({
    playlist: ['https://cdn.uplands.fm/jingles/j1.mp3']
  });
});

// =============================================================
// LIVE STREAM – Uses Same Smart Logic
// =============================================================
app.get('/api/live-stream', async (_, res) => {
  const liveUrl = process.env.LIVE_STREAM_URL || "http://82.145.41.50:17263";
  const now = new Date();
  const day = ['sun','mon','tue','wed','thu','fri','sat'][now.getDay()];

  try {
    const r = await pool.query(`
      SELECT 
        s.id, s.title, s.start_time, s.end_time, s.days,
        COALESCE(json_agg(p.name) FILTER (WHERE p.name IS NOT NULL),'[]') AS presenters
      FROM shows s
      LEFT JOIN presenters p ON p.show_id = s.id
      GROUP BY s.id
    `);

    const validShows = r.rows
      .filter(s => s.days.includes(day))
      .map(s => {
        const [sh, sm, ss] = s.start_time.split(':').map(Number);
        const [eh, em, es] = s.end_time.split(':').map(Number);

        const start = new Date(now);
        start.setHours(sh, sm, ss, 0);

        const end = new Date(now);
        end.setHours(eh, em, es, 0);

        if (end <= start) end.setDate(end.getDate() + 1);

        return { ...s, start, end };
      });

    const active = validShows
      .filter(s => now >= s.start && now < s.end)
      .sort((a, b) => b.start - a.start)[0] || null;

    return res.json({ url: liveUrl, show: active });
  } catch {}

  res.json({
    url: liveUrl,
    show: fallbackShows.find(s => s.days.includes(day)) || null
  });
});

// =============================================================
// ADMIN CHECK
// =============================================================
app.get('/api/check-admin', (req,res) => {
  const ADMIN_KEY = process.env.ADMIN_KEY || "uplands-secret";
  res.json({ isAdmin: req.query.key === ADMIN_KEY });
});

// =============================================================
// START SERVER
// =============================================================
const PORT = process.env.PORT || 5001;
app.listen(PORT, () => console.log(`API Running on port ${PORT}`));