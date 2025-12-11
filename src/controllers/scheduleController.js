import pool from "../config/db.js";

const showsStatic = [
  { id:1, title:'Kipindi Maalumu', start_time:'06:00:00', end_time:'10:00:00', days:['mon','tue','wed','thu','fri','sat'], presenters:[] },
  { id:2, title:'Kipindi Maalumu', start_time:'10:00:00', end_time:'13:00:00', days:['mon','tue','wed','thu','fri'], presenters:[] },
];

export async function getAll(req, res) {
  try {
    const r = await pool.query("SELECT * FROM shows ORDER BY start_time");

    const results = await Promise.all(
      r.rows.map(async show => {
        const pr = await pool.query(
          "SELECT name FROM presenters WHERE show_id = $1",
          [show.id]
        );
        return { ...show, presenters: pr.rows.map(p => p.name) };
      })
    );

    return res.json(results);
  } catch (e) {
    return res.json(showsStatic);
  }
}

export async function getNow(req, res) {
  const now = new Date();
  const map = ["sun","mon","tue","wed","thu","fri","sat"];
  const today = map[now.getDay()];
  const time = now.toTimeString().slice(0,8);

  try {
    const r = await pool.query("SELECT * FROM shows");

    const active = r.rows.find(s => {
      const d = s.days || [];
      if (!d.includes(today)) return false;

      return s.start_time <= s.end_time
        ? time >= s.start_time && time <= s.end_time
        : time >= s.start_time || time <= s.end_time;
    });

    if (active) {
      const pr = await pool.query(
        "SELECT name FROM presenters WHERE show_id=$1",
        [active.id]
      );
      active.presenters = pr.rows.map(p => p.name);

      return res.json(active);
    }
  } catch {}

  const fallback = showsStatic.find(s => s.days.includes(today)) || null;
  return res.json(fallback);
}