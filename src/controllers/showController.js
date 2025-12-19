import { Op } from "sequelize";
import pool from "../config/db.js"; // hii inahakikisha tunatumia Postgres connection ya Render
import { Show } from "../models/Show.js";

// ======================= ADMIN GUARD =======================
async function requireAdmin(req, res) {
  const deviceId = req.headers["x-device-id"];
  if (!deviceId) {
    res.status(403).json({ error: "Forbidden: missing device ID" });
    return false;
  }

  const r = await pool.query(
    "SELECT 1 FROM devices WHERE device_id=$1 AND role='admin' AND active=true",
    [deviceId]
  );

  if (!r.rowCount) {
    res.status(403).json({ error: "Forbidden: not admin" });
    return false;
  }

  return true;
}

// ======================= GET ALL SHOWS =======================
export const getShows = async (req, res) => {
  try {
    const shows = await Show.findAll();
    res.json(shows);
  } catch (err) {
    console.error("GET shows error:", err);
    res.status(500).json({ error: "Server error" });
  }
};

// ======================= CREATE SHOW (ADMIN ONLY) =======================
export const createShow = async (req, res) => {
  if (!(await requireAdmin(req, res))) return;

  const { title, start_time, end_time, days } = req.body;

  try {
    const show = await Show.create({ title, start_time, end_time, days });
    res.json(show);
  } catch (err) {
    console.error("CREATE show error:", err);
    res.status(500).json({ error: "Server error" });
  }
};

// ======================= UPDATE SHOW (ADMIN ONLY) =======================
export const updateShow = async (req, res) => {
  if (!(await requireAdmin(req, res))) return;

  try {
    const show = await Show.findByPk(req.params.id);
    if (!show) return res.status(404).json({ error: "Show not found" });

    const { title, start_time, end_time, days } = req.body;

    const updateData = {
      title: title ?? show.title,
      start_time: start_time ?? show.start_time,
      end_time: end_time ?? show.end_time,
      days: days ?? show.days,
    };

    await show.update(updateData);
    res.json(show);
  } catch (err) {
    console.error("UPDATE show error:", err);
    res.status(500).json({ error: "Server error", details: err.message });
  }
};

// ======================= DELETE SHOW (ADMIN ONLY) =======================
export const deleteShow = async (req, res) => {
  if (!(await requireAdmin(req, res))) return;

  try {
    const show = await Show.findByPk(req.params.id);
    if (!show) return res.status(404).json({ error: "Show not found" });

    await show.destroy();
    res.json({ message: "Show deleted" });
  } catch (err) {
    console.error("DELETE show error:", err);
    res.status(500).json({ error: "Server error" });
  }
};

// ======================= GET LIVE SHOW =======================
export const getLiveShow = async (req, res) => {
  try {
    const now = new Date();

    // ⏱ TIME ONLY (HH:mm:ss)
    const currentTime = now.toTimeString().slice(0, 8);

    // 📅 DAY (mon, tue, ...)
    const days = ["sun","mon","tue","wed","thu","fri","sat"];
    const today = days[now.getDay()];

    const show = await Show.findOne({
      where: {
        start_time: { [Op.lte]: currentTime },
        end_time: { [Op.gte]: currentTime },
        days: { [Op.contains]: [today] }, // ⭐ muhimu sana
      },
    });

    if (!show) {
      return res.json({
        title: "Uplands FM",
        presenters: [],
      });
    }

    res.json({
      title: show.title,
      presenters: [],
      start_time: show.start_time,
      end_time: show.end_time,
    });
  } catch (err) {
    console.error("GET live show error:", err);
    res.status(500).json({ error: "Server error" });
  }
};