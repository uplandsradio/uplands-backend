// ============================================
// UPLANDS FM – SHOWS ROUTES (Postgres + Admin)
// ============================================

import express from "express";
import pool from "../config/db.js"; // Postgres connection

const router = express.Router();

// ================= ADMIN CHECK =================
async function requireAdmin(req, res) {
  const deviceId = req.headers["x-device-id"];
  if (!deviceId) {
    res.status(403).json({ error: "Forbidden: missing device ID" });
    return false;
  }

  const r = await pool.query(
    "SELECT role FROM devices WHERE device_id=$1 AND role='admin'",
    [deviceId]
  );

  if (!r.rows.length) {
    res.status(403).json({ error: "Forbidden: not admin" });
    return false;
  }
  return true;
}

// ================= GET ALL SHOWS =================
router.get("/", async (_, res) => {
  try {
    const r = await pool.query(`
      SELECT s.id, s.title, s.start_time, s.end_time, s.days,
      COALESCE(json_agg(p.name) FILTER (WHERE p.name IS NOT NULL),'[]') AS presenters
      FROM shows s
      LEFT JOIN presenters p ON p.show_id = s.id
      GROUP BY s.id
      ORDER BY s.start_time
    `);
    res.json(r.rows);
  } catch (err) {
    console.error("GET shows error:", err);
    res.status(500).json({ error: "Server error" });
  }
});

// ================= CREATE SHOW =================
router.post("/", async (req, res) => {
  if (!(await requireAdmin(req, res))) return;

  const { title, start_time, end_time, days } = req.body;

  try {
    const result = await pool.query(
      `INSERT INTO shows (title, start_time, end_time, days) VALUES ($1,$2,$3,$4) RETURNING *`,
      [title, start_time, end_time, days] // days as Postgres array
    );
    res.json(result.rows[0]);
  } catch (err) {
    console.error("CREATE show error:", err);
    res.status(500).json({ error: "Server error" });
  }
});

// ================= UPDATE SHOW =================
router.put("/:id", async (req, res) => {
  if (!(await requireAdmin(req, res))) return;

  const id = req.params.id;
  const { title, start_time, end_time, days } = req.body;

  try {
    const result = await pool.query(
      `UPDATE shows SET title=$1, start_time=$2, end_time=$3, days=$4 WHERE id=$5 RETURNING *`,
      [title, start_time, end_time, days, id]
    );

    if (!result.rows.length)
      return res.status(404).json({ error: "Show not found" });

    res.json(result.rows[0]);
  } catch (err) {
    console.error("UPDATE show error:", err);
    res.status(500).json({ error: "Server error" });
  }
});

// ================= DELETE SHOW =================
router.delete("/:id", async (req, res) => {
  if (!(await requireAdmin(req, res))) return;

  const id = req.params.id;

  try {
    const result = await pool.query(
      `DELETE FROM shows WHERE id=$1 RETURNING *`,
      [id]
    );

    if (!result.rows.length)
      return res.status(404).json({ error: "Show not found" });

    res.json({ message: "Show deleted" });
  } catch (err) {
    console.error("DELETE show error:", err);
    res.status(500).json({ error: "Server error" });
  }
});

export default router;
