// ------------------------------------------------------------
// UPLANDS FM – CLEAN PRODUCTION BACKEND (PostgreSQL + Uploads + Reports + Comment Filtering)
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
import http from 'http';
import https from 'https';
import url from 'url';

const { Pool } = pkg;
const app = express();

app.use(cors());
app.use(bodyParser.json());

// -----------------------------------------
// DATABASE (Render / Production safe)
// -----------------------------------------
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
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
// STATIC FALLBACK
// -----------------------------------------
const fallbackShows = [
  { id:1, title:'Kipindi Maalumu', start_time:'06:00:00', end_time:'10:00:00', days:['mon','tue','wed','thu','fri','sat'], presenters:['Default Presenter'] },
  { id:2, title:'Kipindi Maalumu', start_time:'10:00:00', end_time:'13:00:00', days:['mon','tue','wed','thu','fri'], presenters:['Default Presenter'] }
];

// -----------------------------------------
// ROOT
// -----------------------------------------
app.get("/", (_, res) => res.send("Uplands API Running 🚀"));

// =============================================================
// 🔥 STREAM HEALTH
// =============================================================
app.get("/api/stream/health", (_, res) => {
  const streamUrl = process.env.RADIO_STREAM;
  if (!streamUrl) return res.json({ status: "DOWN", checkedAt: new Date().toISOString() });

  try {
    const parsed = url.parse(streamUrl);
    const lib = parsed.protocol === "https:" ? https : http;
    const timeoutMs = 3000;

    const request = lib.request({
      hostname: parsed.hostname,
      port: parsed.port || (parsed.protocol === "https:" ? 443 : 80),
      path: parsed.path,
      method: "GET",
      headers: { "Icy-MetaData": "1" },
    }, (response) => {
      response.destroy();
      res.json({ status: "LIVE", checkedAt: new Date().toISOString() });
    });

    request.on("error", () => {
      res.json({ status: "DOWN", checkedAt: new Date().toISOString() });
    });

    request.setTimeout(timeoutMs, () => {
      request.abort();
      res.json({ status: "DOWN", checkedAt: new Date().toISOString() });
    });

    request.end();
  } catch {
    res.json({ status: "DOWN", checkedAt: new Date().toISOString() });
  }
});

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

app.put('/api/shows/:id', async (req, res) => {
  const { id } = req.params;
  const { title, start_time, end_time, days } = req.body;
  const deviceId = req.headers['x-device-id'];

  if (!deviceId) return res.status(403).json({ error: "Forbidden" });

  const r = await pool.query(
    `SELECT role FROM devices WHERE device_id=$1 LIMIT 1`,
    [deviceId]
  );

  if (!r.rows.length || r.rows[0].role !== 'admin') {
    return res.status(403).json({ error: "Forbidden" });
  }

  try {
    const q = await pool.query(
      `UPDATE shows
       SET title=$1, start_time=$2, end_time=$3, days=$4
       WHERE id=$5
       RETURNING *`,
      [title, start_time, end_time, days, id]
    );

    if (!q.rows.length) return res.status(404).json({ error: "Show not found" });

    res.json(q.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to update show" });
  }
});

app.delete('/api/shows/:id', async (req, res) => {
  const { id } = req.params;
  const deviceId = req.headers['x-device-id'];

  if (!deviceId) return res.status(403).json({ error: "Forbidden" });

  const r = await pool.query(
    `SELECT role FROM devices WHERE device_id=$1 LIMIT 1`,
    [deviceId]
  );

  if (!r.rows.length || r.rows[0].role !== 'admin') {
    return res.status(403).json({ error: "Forbidden" });
  }

  try {
    await pool.query(`DELETE FROM shows WHERE id=$1`, [id]);
    res.json({ success: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to delete show" });
  }
});

app.get('/api/shows/now', async (_, res) => {
  try {
    const now = new Date();
    const today = ['sun','mon','tue','wed','thu','fri','sat'][now.getDay()];

    const r = await pool.query(`
      SELECT s.*, COALESCE(json_agg(p.name)
      FILTER (WHERE p.name IS NOT NULL),'[]') AS presenters
      FROM shows s
      LEFT JOIN presenters p ON p.show_id = s.id
      GROUP BY s.id
    `);

    const active = r.rows
      .filter(s => s.days.includes(today))
      .map(s => {
        const start = new Date(now);
        const end = new Date(now);
        const [sh,sm,ss] = s.start_time.split(':');
        const [eh,em,es] = s.end_time.split(':');

        start.setHours(sh,sm,ss,0);
        end.setHours(eh,em,es,0);
        if (end <= start) end.setDate(end.getDate()+1);

        return { ...s, start, end };
      })
      .find(s => now >= s.start && now < s.end) || null;

    res.json(active);
  } catch {
    res.json(null);
  }
});

app.post('/api/shows', async (req, res) => {
  const { title, start_time, end_time, days } = req.body;
  const deviceId = req.headers['x-device-id'];

  if (!deviceId) return res.status(403).json({ error: "Forbidden" });

  const r = await pool.query(
    `SELECT role FROM devices WHERE device_id=$1 LIMIT 1`,
    [deviceId]
  );

  if (!r.rows.length || r.rows[0].role !== 'admin') {
    return res.status(403).json({ error: "Forbidden" });
  }

  try {
    const q = await pool.query(
      `INSERT INTO shows(title, start_time, end_time, days)
       VALUES($1,$2,$3,$4)
       RETURNING *`,
      [title, start_time, end_time, days]
    );

    res.json(q.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to create show" });
  }
});

// =============================================================
// PRESENTERS
// =============================================================
app.get('/api/presenters', async (_, res) => {
  try {
    const r = await pool.query(`SELECT * FROM presenters ORDER BY id DESC`);
    res.json(r.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to fetch presenters" });
  }
});

app.post('/api/presenters', async (req,res) => {
  const { name, bio, show_id, photo_url } = req.body;
  try {
    const r = await pool.query(
      `INSERT INTO presenters(name,bio,show_id,photo_url) VALUES($1,$2,$3,$4) RETURNING *`,
      [name,bio,show_id,photo_url]
    );
    res.json(r.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error:"Failed to create presenter" });
  }
});

app.put('/api/presenters/:id', async (req,res) => {
  const { id } = req.params;
  const { name, bio, show_id, photo_url } = req.body;
  try {
    const r = await pool.query(
      `UPDATE presenters SET name=$1, bio=$2, show_id=$3, photo_url=$4 WHERE id=$5 RETURNING *`,
      [name,bio,show_id,photo_url,id]
    );
    res.json(r.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error:"Failed to update presenter" });
  }
});

app.delete('/api/presenters/:id', async (req,res) => {
  const { id } = req.params;
  const deviceId = req.headers['x-device-id'];
  if (!deviceId) return res.status(403).json({ error:"Forbidden" });

  const r = await pool.query(`SELECT role FROM devices WHERE device_id=$1`, [deviceId]);
  if (!r.rows.length || r.rows[0].role !== 'admin') return res.status(403).json({ error:"Forbidden" });

  try {
    await pool.query(`DELETE FROM presenters WHERE id=$1`, [id]);
    res.json({ success:true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error:"Failed to delete presenter" });
  }
});

// =============================================================
// COMMENTS + FILTER + BLOCK (Persistent in PostgreSQL)
// =============================================================
const offensiveWords = ['badword1','badword2','badword3']; // TODO: add real list

function containsOffensive(text) {
  return offensiveWords.some(w => text.toLowerCase().includes(w));
}

// Post a comment
app.post('/api/comments', async (req,res) => {
  const { username, message } = req.body;
  if (!message) return res.status(400).json({ error:"Message required" });

  const hidden = containsOffensive(message);

  try {
    const r = await pool.query(
      `INSERT INTO comments(username, message, hidden, created_at)
       VALUES($1,$2,$3,NOW())
       RETURNING *`,
      [username || "Guest", message, hidden]
    );

    res.json(r.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error:"Failed to save comment" });
  }
});

// Get visible comments
app.get('/api/comments', async (_, res) => {
  try {
    const r = await pool.query(`SELECT * FROM comments WHERE hidden=false ORDER BY created_at DESC`);
    res.json(r.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error:"Failed to fetch comments" });
  }
});

// Report a comment
app.post('/api/report-comment', async (req,res) => {
  const { commentId, reason } = req.body;
  const reporter = req.headers['x-device-id'] || "Anonymous";

  if (!commentId || !reason) return res.status(400).json({ error:"commentId and reason required" });

  try {
    const c = await pool.query(`SELECT * FROM comments WHERE id=$1`, [commentId]);
    if (!c.rows.length) return res.status(404).json({ error:"Comment not found" });

    const r = await pool.query(
      `INSERT INTO comment_reports(comment_id, reported_by, reason, created_at)
       VALUES($1,$2,$3,NOW())
       RETURNING *`,
      [commentId, reporter, reason]
    );

    res.json({ success:true, report: r.rows[0] });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error:"Failed to report comment" });
  }
});

// Get all reports (admin only)
app.get('/api/reports', async (req,res) => {
  const deviceId = req.headers['x-device-id'];
  if (!deviceId) return res.status(403).json({ error:"Forbidden" });

  const r = await pool.query(`SELECT role FROM devices WHERE device_id=$1`, [deviceId]);
  if (!r.rows.length || r.rows[0].role !== 'admin') return res.status(403).json({ error:"Forbidden" });

  try {
    const reportsRes = await pool.query(`SELECT * FROM comment_reports ORDER BY created_at DESC`);
    res.json(reportsRes.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error:"Failed to fetch reports" });
  }
});

// Delete a comment (admin only)
app.delete('/api/comments/:id', async (req,res) => {
  const deviceId = req.headers['x-device-id'];
  if (!deviceId) return res.status(403).json({ error:"Forbidden" });

  const r = await pool.query(`SELECT role FROM devices WHERE device_id=$1`, [deviceId]);
  if (!r.rows.length || r.rows[0].role !== 'admin') return res.status(403).json({ error:"Forbidden" });

  try {
    const del = await pool.query(`DELETE FROM comments WHERE id=$1`, [req.params.id]);
    if (del.rowCount === 0) return res.status(404).json({ error:"Not found" });
    res.json({ success:true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error:"Failed to delete comment" });
  }
});

// =============================================================
// LIVE STREAM
// =============================================================
app.get('/api/live-stream', (_, res) => {
  res.json({
    url: process.env.RADIO_STREAM,
    show: null
  });
});

// =============================================================
// 🔐 ADMIN CHECK
// =============================================================
app.get('/api/check-admin', async (req,res) => {
  try {
    const deviceId = req.query.device_id;
    if (!deviceId) return res.json({ isAdmin:false });

    const r = await pool.query(`SELECT role FROM devices WHERE device_id=$1 LIMIT 1`, [deviceId]);
    res.json({ isAdmin: r.rows.length && r.rows[0].role === 'admin' });
  } catch {
    res.json({ isAdmin:false });
  }
});

// =============================================================
// IMAGE UPLOAD
// =============================================================
app.post('/api/upload_presenter_image', upload.single('file'), (req,res) => {
  if (!req.file) return res.status(400).json({ error:"No file uploaded" });
  const url = `/uploads/${req.file.filename}`;
  res.json({ url });
});

// =============================================================
// START SERVER
// =============================================================
const PORT = process.env.PORT || 5001;
app.listen(PORT, () => console.log(`✅ Uplands API running on port ${PORT}`));