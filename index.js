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
import http from 'http';
import https from 'https';
import url from 'url';

const { Pool, types } = pkg;  // 🔹 include types hapa
const app = express();

app.use(cors());
app.use(bodyParser.json());

// 🔹 Hapa tunashughulikia BigInt kwa Node.js/pg
types.setTypeParser(20, val => parseInt(val)); // int8 = 20

// -----------------------------------------
// DATABASE
// -----------------------------------------
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});
const db = pool;
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
const upload = multer({ 
  storage,
  limits: { fileSize: 10 * 1024 * 1024 } // 10MB
});
app.use('/uploads', express.static(uploadDir));

// -----------------------------------------
// HELPER: Admin Check
// -----------------------------------------
async function isAdmin(deviceId) {
  if (!deviceId) return false;
  try {
    const r = await db.query(
      "SELECT role FROM devices WHERE device_id=$1 LIMIT 1",
      [deviceId]
    );
    return r.rows.length && r.rows[0].role === "admin";
  } catch {
    return false;
  }
}

// -----------------------------------------
// FALLBACK SHOWS
// -----------------------------------------
const fallbackShows = [
  {
    id: 1,
    title: 'Kipindi Maalumu',
    start_time: '06:00:00',
    end_time: '10:00:00',
    days: ['mon','tue','wed','thu','fri','sat'],
    presenters: [{ name:'Default Presenter', photo_url: '' }]
  },
  {
    id: 2,
    title: 'Kipindi Maalumu',
    start_time: '10:00:00',
    end_time: '13:00:00',
    days: ['mon','tue','wed','thu','fri'],
    presenters: [{ name:'Default Presenter', photo_url: '' }]
  }
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

    request.on("error", () => res.json({ status: "DOWN", checkedAt: new Date().toISOString() }));
    request.setTimeout(3000, () => { request.abort(); res.json({ status: "DOWN", checkedAt: new Date().toISOString() }); });
    request.end();
  } catch {
    res.json({ status: "DOWN", checkedAt: new Date().toISOString() });
  }
});

// =============================================================
// SHOWS NOW (UPDATED: include shows without presenters)
// =============================================================
app.get('/api/shows/now', async (_, res) => {
  try {
    const now = new Date();
    const today = ['sun','mon','tue','wed','thu','fri','sat'][now.getDay()];

    const r = await db.query(`
      SELECT s.id, s.title, s.start_time, s.end_time,
        COALESCE(s.days::text[], '{}') AS days,
        COALESCE(
          json_agg(
            DISTINCT jsonb_build_object(
              'id', p.id,
              'name', p.name,
              'photo_url', p.photo_url
            )
          ) FILTER (WHERE TRUE),
          '[]'
        ) AS presenters
      FROM shows s
      LEFT JOIN show_presenters sp ON sp.show_id = s.id
      LEFT JOIN presenters p ON p.id = sp.presenter_id
      GROUP BY s.id
    `);

    const active = r.rows
      .map(s => {
        let daysArray = [];
        try {
          if (Array.isArray(s.days)) daysArray = s.days;
          else daysArray = JSON.parse(s.days);
        } catch {
          daysArray = [];
        }

        const start = new Date(now);
        const end = new Date(now);
        const [sh, sm, ss] = s.start_time.split(':').map(Number);
        const [eh, em, es] = s.end_time.split(':').map(Number);

        start.setHours(sh, sm, ss, 0);
        end.setHours(eh, em, es, 0);
        if (end <= start) end.setDate(end.getDate() + 1);

        return { ...s, start, end, days: daysArray };
      })
      .filter(s => s.days.includes(today))
      .find(s => now >= s.start && now < s.end) || null;

    res.json(active);
  } catch (e) {
    console.error("❌ /api/shows/now error:", e);
    res.status(500).json({ error: "Failed to fetch current show" });
  }
});

// =============================================================
// CREATE SHOW (POST)
app.post('/api/shows', async (req, res) => {
  const deviceId = req.headers['x-device-id'];
  if (!await isAdmin(deviceId)) return res.status(403).json({ error: "Forbidden" });

  const { title, start_time, end_time, days } = req.body;
  if (!title || !start_time || !end_time || !days || !Array.isArray(days)) {
    return res.status(400).json({ error: "title, start_time, end_time, and days (array) are required" });
  }

  try {
    const pgDays = `{${days.join(',')}}`;
    const r = await db.query(
      `INSERT INTO shows(title, start_time, end_time, days)
       VALUES($1,$2,$3,$4) RETURNING *`,
      [title, start_time, end_time, pgDays]
    );

    res.json(r.rows[0]);
  } catch (err) {
    console.error("❌ Error creating show:", err);
    res.status(500).json({ error: "Failed to create show" });
  }
});

app.get('/api/shows', async (_, res) => {
  try {
    const r = await db.query(`
      SELECT s.id, s.title, s.start_time, s.end_time,
        COALESCE(s.days::text[], '{}') AS days,
        COALESCE(
          json_agg(
            DISTINCT jsonb_build_object(
              'id', p.id,
              'name', p.name,
              'photo_url', p.photo_url
            )
          ) FILTER (WHERE p.id IS NOT NULL),
          '[]'
        ) AS presenters
      FROM shows s
      LEFT JOIN show_presenters sp ON sp.show_id = s.id
      LEFT JOIN presenters p ON p.id = sp.presenter_id
      GROUP BY s.id
      ORDER BY s.start_time;
    `);

    // Parsers days from string to array
    const shows = r.rows.map(s => {
      let daysArray = [];
      try {
        if (Array.isArray(s.days)) daysArray = s.days;
        else daysArray = JSON.parse(s.days);
      } catch {
        daysArray = [];
      }
      return { ...s, days: daysArray };
    });

    res.json(shows);
  } catch (e) {
    console.error("❌ /api/shows error:", e);
    res.status(500).json({ error: "Failed to fetch shows" });
  }
});

// =============================================================
// UPDATE SHOW (PUT)
app.put('/api/shows/:id', async (req, res) => {
  const deviceId = req.headers['x-device-id'];
  if (!await isAdmin(deviceId)) return res.status(403).json({ error: "Forbidden" });

  const { id } = req.params;
  const { title, start_time, end_time, days } = req.body;

  if (!title || !start_time || !end_time || !days || !Array.isArray(days)) {
    return res.status(400).json({ error: "title, start_time, end_time, and days (array) are required" });
  }

  try {
    const pgDays = `{${days.join(',')}}`;

    const r = await db.query(
      `UPDATE shows
       SET title=$1, start_time=$2, end_time=$3, days=$4
       WHERE id=$5
       RETURNING *`,
      [title, start_time, end_time, pgDays, id]
    );

    if (!r.rows.length) return res.status(404).json({ error: "Show not found" });
    res.json(r.rows[0]);
  } catch (err) {
    console.error("❌ Error updating show:", err);
    res.status(500).json({ error: "Failed to update show" });
  }
});

app.delete('/api/shows/:id', async (req,res) => {
  const deviceId = req.headers['x-device-id'];
  if (!await isAdmin(deviceId)) return res.status(403).json({ error:"Forbidden" });

  const { id } = req.params;
  try {
    await db.query(`DELETE FROM shows WHERE id=$1`, [id]);
    await db.query(`DELETE FROM show_presenters WHERE show_id=$1`, [id]);
    res.json({ success:true });
  } catch(err) {
    console.error(err);
    res.status(500).json({ error:"Failed to delete show" });
  }
});


app.delete('/api/shows/:id/presenters/:presenterId', async (req,res) => {
  const deviceId = req.headers['x-device-id'];
  if (!await isAdmin(deviceId)) return res.status(403).json({ error:"Forbidden" });

  const { id, presenterId } = req.params;

  try {
    await db.query(
      `DELETE FROM show_presenters WHERE show_id=$1 AND presenter_id=$2`,
      [id, presenterId]
    );
    res.json({ success:true });
  } catch(e) {
    console.error(e);
    res.status(500).json({ error:"Failed to remove presenter" });
  }
});

// =============================================================
// ASSIGN PRESENTER TO SHOW (MANY-TO-MANY)
// =============================================================
app.post('/api/shows/:id/presenters', async (req,res) => {
  const { presenter_id } = req.body;
  const show_id = req.params.id;

  const deviceId = req.headers['x-device-id'];
  if (!await isAdmin(deviceId)) {
    return res.status(403).json({ error: "Forbidden" });
  }

  if (!presenter_id) {
    return res.status(400).json({ error: "presenter_id is required" });
  }

  try {
    await db.query(
      `INSERT INTO show_presenters(show_id, presenter_id)
       VALUES($1,$2)
       ON CONFLICT DO NOTHING`,
      [show_id, presenter_id]
    );

    res.json({ success: true });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "Failed to assign presenter" });
  }
});

// ==========================
// CREATE OR UPDATE PRESENTER
// ==========================
app.post("/api/presenters", async (req, res) => {
  const deviceId = req.headers['x-device-id'];
  if (!await isAdmin(deviceId)) return res.status(403).json({ error: "Forbidden" });

  const { name, bio, photo_url, show_ids } = req.body;

  if (!name) return res.status(400).json({ error: "name is required" });

  try {
    // Insert presenter first
    const presenterResult = await db.query(
      `INSERT INTO presenters (name, bio, photo_url, created_at)
       VALUES ($1, $2, $3, NOW()) RETURNING id`,
      [name, bio || "", photo_url || ""]
    );

    const presenterId = presenterResult.rows[0].id;

    // Assign to shows if any
    if (Array.isArray(show_ids) && show_ids.length > 0) {
      const insertLinks = show_ids.map(showId =>
        db.query(
          `INSERT INTO show_presenters (show_id, presenter_id)
           VALUES($1,$2) ON CONFLICT DO NOTHING`,
          [showId, presenterId]
        )
      );
      await Promise.all(insertLinks);
    }

    res.json({ success: true, id: presenterId });
  } catch (err) {
    console.error("❌ Error creating presenter:", err);
    res.status(500).json({ error: "Failed to create presenter" });
  }
});

app.post('/api/upload_ad_image', upload.single('file'), (req,res) => {
  if (!req.file) return res.status(400).json({ error:"No file uploaded" });

  const fullUrl = `${process.env.BASE_URL}/uploads/${req.file.filename}`;
  res.json({ imageUrl: fullUrl });
});

app.put("/api/presenters/:id", async (req,res) => {
  const deviceId = req.headers['x-device-id'];
  if (!await isAdmin(deviceId)) return res.status(403).json({ error: "Forbidden" });

  const { id } = req.params;
  const { name, bio, photo_url, show_ids } = req.body;

  if (!name) return res.status(400).json({ error: "name is required" });

  try {
    // Update presenter
    const r = await db.query(
      `UPDATE presenters SET name=$1, bio=$2, photo_url=$3 WHERE id=$4 RETURNING *`,
      [name, bio || "", photo_url || "", id]
    );

    if (!r.rows.length) return res.status(404).json({ error:"Presenter not found" });

    // Sync show assignments
    if (Array.isArray(show_ids)) {
      // 1️⃣ Remove all old links
      await db.query(`DELETE FROM show_presenters WHERE presenter_id=$1`, [id]);

      // 2️⃣ Insert new links
      const insertLinks = show_ids.map(showId =>
        db.query(
          `INSERT INTO show_presenters (show_id, presenter_id) VALUES($1,$2) ON CONFLICT DO NOTHING`,
          [showId, id]
        )
      );
      await Promise.all(insertLinks);
    }

    res.json({ success:true, presenter: r.rows[0] });
  } catch(err){
    console.error("❌ Error updating presenter:", err);
    res.status(500).json({ error:"Failed to update presenter" });
  }
});

// =============================================================
// GET ALL PRESENTERS
app.get('/api/presenters', async (req, res) => {
  try {
    const r = await db.query(`SELECT id, name, bio, photo_url FROM presenters ORDER BY name`);
    res.json(r.rows);
  } catch (err) {
    console.error("❌ /api/presenters GET error:", err);
    res.status(500).json({ error: "Failed to fetch presenters" });
  }
});

app.delete('/api/presenters/:id', async (req,res) => {
  const deviceId = req.headers['x-device-id'];
  if (!await isAdmin(deviceId)) return res.status(403).json({ error:"Forbidden" });

  const { id } = req.params;
  try {
    await db.query(`DELETE FROM presenters WHERE id=$1`, [id]);
    await db.query(`DELETE FROM show_presenters WHERE presenter_id=$1`, [id]);
    res.json({ success:true });
  } catch(err){
    console.error(err);
    res.status(500).json({ error:"Failed to delete presenter" });
  }
});

// =============================================================
// LISTENERS (UNCHANGED)
// =============================================================
app.post('/api/listeners/start', async (req,res) => {
  const { device_id } = req.body;
  if (!device_id) return res.status(400).json({ error:"device_id required" });

  try {
    await db.query(`INSERT INTO listener_logs(device_id, listen_start) VALUES($1, NOW())`, [device_id]);
    res.json({ success:true });
  } catch(err){ console.error(err); res.status(500).json({ error:"Failed to start listener" }); }
});

app.post('/api/listeners/stop', async (req,res) => {
  const { device_id } = req.body;
  if (!device_id) return res.status(400).json({ error:"device_id required" });

  try {
    await db.query(`UPDATE listener_logs SET listen_end=NOW() WHERE device_id=$1 AND listen_end IS NULL`, [device_id]);
    res.json({ success:true });
  } catch(err){ console.error(err); res.status(500).json({ error:"Failed to stop listener" }); }
});

app.get('/api/listeners', async (req, res) => {
  const { period } = req.query;
  let query = '';
  switch (period) {
    case 'daily': query = `SELECT COUNT(DISTINCT device_id) AS count FROM listener_logs WHERE listen_start::date=CURRENT_DATE`; break;
    case 'weekly': query = `SELECT COUNT(DISTINCT device_id) AS count FROM listener_logs WHERE listen_start>=date_trunc('week', CURRENT_DATE)`; break;
    case 'monthly': query = `SELECT COUNT(DISTINCT device_id) AS count FROM listener_logs WHERE listen_start>=date_trunc('month', CURRENT_DATE)`; break;
    case 'quarterly': query = `SELECT COUNT(DISTINCT device_id) AS count FROM listener_logs WHERE listen_start>=CURRENT_DATE-INTERVAL '3 months'`; break;
    case 'half_year': query = `SELECT COUNT(DISTINCT device_id) AS count FROM listener_logs WHERE listen_start>=CURRENT_DATE-INTERVAL '6 months'`; break;
    case 'yearly': query = `SELECT COUNT(DISTINCT device_id) AS count FROM listener_logs WHERE listen_start>=date_trunc('year', CURRENT_DATE)`; break;
    default: return res.status(400).json({ error:'Invalid period' });
  }

  try {
    const result = await db.query(query);
    res.json({ count: result.rows[0].count });
  } catch(e){ console.error(e); res.status(500).json({ error:'Server error' }); }
});

// =============================================================
// COMMENTS CRUD + REPORT (UNCHANGED)
// =============================================================
app.get('/api/comments', async (_, res) => {
  try {
    const r = await pool.query(`
      SELECT 
        c.id,
        c.username,
        c.message,
        c.show_name,
        c.hidden,
        c.device_id,
        c.created_at,
        COALESCE(rc.reports_count, 0) AS reports_count
      FROM comments c
      LEFT JOIN (
        SELECT comment_id, COUNT(*) AS reports_count
        FROM comment_reports
        GROUP BY comment_id
      ) rc ON rc.comment_id = c.id
      WHERE c.hidden=false
      ORDER BY c.created_at DESC
      LIMIT 100
    `);

    res.json(r.rows);

  } catch (err) {
    console.error(err);
    res.status(500).json({ error:"Failed to fetch comments" });
  }
});

app.post('/api/comments', async (req,res) => {
  const { username,message,show_name } = req.body;
  const deviceId = req.headers['x-device-id'];

  if (!message) return res.status(400).json({ error:"Message required" });

  try {
    const r = await db.query(
  `INSERT INTO comments(username, message, show_name, device_id, hidden, reported, created_at)
   VALUES($1, $2, $3, $4, $5, $6, NOW()) RETURNING *`,
  [
  username || 'Guest',
  message,
  show_name || 'Other', // 🔥 muhimu
  deviceId || null,
  false,
  false
]
);

    res.json(r.rows[0]);
  } catch(err){
    console.error(err);
    res.status(500).json({ error:"Failed to create comment" });
  }
});

app.delete('/api/comments/:id', async (req,res) => {
  const { id } = req.params;
  const deviceId = req.headers['x-device-id'];
  if (!await isAdmin(deviceId)) return res.status(403).json({ error:"Forbidden" });

  try {
    const r = await db.query(`DELETE FROM comments WHERE id=$1 RETURNING *`, [id]);
    if (!r.rows.length) return res.status(404).json({ error:"Comment not found" });
    res.json({ success:true });
  } catch(err){ console.error(err); res.status(500).json({ error:"Failed to delete comment" }); }
});

app.post('/api/comments/:id/report', async (req,res) => {
  const { id } = req.params;
  const { device_id } = req.body;  // 🔹 tumia body

  if (!device_id) {
    return res.status(400).json({ error: "Device ID is required to report a comment" });
  }

  try {
    await db.query(
      `INSERT INTO comment_reports(comment_id, device_id, created_at)
       VALUES($1, $2, NOW())
       ON CONFLICT (comment_id, device_id) DO NOTHING`,
      [id, device_id]
    );

    const r = await db.query(
      `SELECT COUNT(*) AS reports FROM comment_reports WHERE comment_id=$1`,
      [id]
    );

    const reports = parseInt(r.rows[0].reports, 10);

    if (reports >= 10) {
      await db.query(`UPDATE comments SET hidden=true WHERE id=$1`, [id]);
    }

    res.json({ success:true, reports });

  } catch(err){
    console.error(err);
    res.status(500).json({ error:"Failed to report comment" });
  }
});

app.get('/api/comments/reported', async (req,res) => {
  const deviceId = req.headers['x-device-id'];
  if (!await isAdmin(deviceId)) return res.status(403).json({ error:"Forbidden" });

  try {
    // Chukua comments zilizo na reports zaidi ya 0 na ambazo hazija hide
    const r = await db.query(`
      SELECT c.*, COALESCE(rc.reports_count, 0) AS reports_count
      FROM comments c
      LEFT JOIN (
        SELECT comment_id, COUNT(*) AS reports_count
        FROM comment_reports
        GROUP BY comment_id
      ) rc ON rc.comment_id = c.id
      WHERE rc.reports_count > 0
      ORDER BY rc.reports_count DESC, c.created_at DESC
    `);

    res.json(r.rows);

  } catch(err){
    console.error(err);
    res.status(500).json({ error:"Failed to fetch reported comments" });
  }
});

// =============================================================
// ADS SYSTEM
// =============================================================

// GET ACTIVE ADS (HOME SCREEN)
app.get('/api/ads', async (req, res) => {
  try {
    const r = await db.query(`
      SELECT * FROM ads
WHERE is_active = true
AND NOW() BETWEEN start_at AND end_at
ORDER BY id DESC
LIMIT 10;
    `);

    res.json(r.rows);
  } catch (err) {
    console.error("❌ Fetch ads error:", err);
    res.status(500).json({ error: "Failed to fetch ads" });
  }
});

// ADMIN: GET ALL ADS
app.get('/api/admin/ads', async (req, res) => {
  const deviceId = req.headers['x-device-id'];
  if (!await isAdmin(deviceId)) return res.status(403).json({ error: "Forbidden" });

  try {
    const r = await db.query(`SELECT * FROM ads ORDER BY created_at DESC`);
    res.json(r.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to fetch ads" });
  }
});

// CREATE / UPDATE AD
app.post('/api/admin/ads', async (req, res) => {
  console.log("📩 ADMIN ADS REQUEST:", req.body);
  console.log("🧠 DEVICE ID:", req.headers['x-device-id']);
  const deviceId = req.headers['x-device-id'];
  if (!await isAdmin(deviceId)) return res.status(403).json({ error: "Forbidden" });

  const {
  id,
  image_url,
  link,
  link_type,
  start_at,
  end_at
} = req.body;

  try {
    if (id) {
      // UPDATE
      const result = await db.query(`
  UPDATE ads SET
  image_url=$1,
  link=$2,
  link_type=$3,
  start_at=$4,
  end_at=$5
WHERE id=$6
RETURNING *
`, [image_url, link, link_type, start_at, end_at, id]);

return res.json(result.rows[0]);

    } else {
      // INSERT
const result = await db.query(`
  INSERT INTO ads (
    image_url,
    link,
    link_type,
    start_at,
    end_at,
    is_active
  )
  VALUES ($1,$2,$3,$4,$5,true)
  RETURNING *
`, [
  image_url,
  link,
  link_type,
  start_at,
  end_at
]);

console.log("🔥 INSERT RESULT:", result.rows);
return res.json(result.rows[0]);
    }


  } catch (err) {
  console.error("❌ Save ad error:", err);
  res.status(500).json({ error: err.message });
}
});

// DELETE AD
app.delete('/api/admin/ads/:id', async (req, res) => {
  const deviceId = req.headers['x-device-id'];
  if (!await isAdmin(deviceId)) return res.status(403).json({ error: "Forbidden" });

  try {
    await db.query(`DELETE FROM ads WHERE id=$1`, [req.params.id]);
    res.json({ success: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to delete ad" });
  }
});

// TRACK VIEW
app.post('/api/ads/view/:id', async (req, res) => {
  try {
    await db.query(`UPDATE ads SET views = views + 1 WHERE id=$1`, [req.params.id]);
    res.json({ success: true });
  } catch {
    res.status(500).json({ error: "Failed" });
  }
});

// TRACK CLICK
app.post('/api/ads/click/:id', async (req, res) => {
  try {
    await db.query(`UPDATE ads SET clicks = clicks + 1 WHERE id=$1`, [req.params.id]);
    res.json({ success: true });
  } catch {
    res.status(500).json({ error: "Failed" });
  }
});

// =============================================================
// LIVE STREAM
// =============================================================
app.get('/api/live-stream', (_,res) => res.json({ url:process.env.RADIO_STREAM, show:null }));

// =============================================================
// IMAGE UPLOAD
// =============================================================
app.post('/api/upload_presenter_image', upload.single('file'), (req,res) => {
  if (!req.file) return res.status(400).json({ error:"No file uploaded" });
  const fullUrl = `${process.env.BASE_URL}/uploads/${req.file.filename}`;
  res.json({ url: fullUrl });
});

// =============================================================
// ADMIN CHECK
// =============================================================
app.get('/api/check-admin', async (req,res) => {
  const deviceId = req.query.device_id;
  const admin = await isAdmin(deviceId);
  res.json({ isAdmin: admin });
});

// =============================================================
// START SERVER
// =============================================================
const PORT = process.env.PORT || 5001;
app.listen(PORT, () => console.log(`✅ Uplands API running on port ${PORT}`));