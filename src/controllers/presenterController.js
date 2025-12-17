import pool from "../config/db.js";

// ======================= GET ALL (PUBLIC) =======================
export async function getPresenters(req, res) {
  try {
    const r = await pool.query(
      "SELECT id, name, show_id, photo_url, bio FROM presenters ORDER BY id"
    );
    res.json(r.rows);
  } catch (e) {
    console.error("GET presenters error:", e);
    res.status(500).json({ error: "Failed to load presenters" });
  }
}

// ======================= ADMIN GUARD =======================
async function requireAdmin(req, res) {
  const deviceId = req.headers["x-device-id"];
  if (!deviceId) {
    res.status(403).json({ error: "Forbidden" });
    return false;
  }

  const r = await pool.query(
    "SELECT 1 FROM devices WHERE device_id=$1 AND role='admin' AND active=true",
    [deviceId]
  );

  if (!r.rowCount) {
    res.status(403).json({ error: "Not admin" });
    return false;
  }

  return true;
}

// ======================= CREATE (ADMIN ONLY) =======================
export async function createPresenter(req, res) {
  if (!(await requireAdmin(req, res))) return;

  const { name, show_id, photo_url, bio } = req.body;

  try {
    const r = await pool.query(
      `INSERT INTO presenters(name, show_id, photo_url, bio)
       VALUES($1, $2, $3, $4)
       RETURNING *`,
      [name, show_id, photo_url, bio]
    );

    res.json(r.rows[0]);
  } catch (e) {
    console.error("CREATE presenter error:", e);
    res.status(500).json({ error: "Failed to add presenter" });
  }
}

// ======================= UPDATE (ADMIN ONLY) =======================
export async function updatePresenter(req, res) {
  if (!(await requireAdmin(req, res))) return;

  const { id } = req.params;
  const { name, show_id, photo_url, bio } = req.body;

  try {
    const r = await pool.query(
      `UPDATE presenters
       SET name=$1, show_id=$2, photo_url=$3, bio=$4
       WHERE id=$5
       RETURNING *`,
      [name, show_id, photo_url, bio, id]
    );

    res.json(r.rows[0]);
  } catch (e) {
    console.error("UPDATE presenter error:", e);
    res.status(500).json({ error: "Failed to update presenter" });
  }
}

// ======================= DELETE (ADMIN ONLY) =======================
export async function deletePresenter(req, res) {
  if (!(await requireAdmin(req, res))) return;

  const { id } = req.params;

  try {
    await pool.query("DELETE FROM presenters WHERE id=$1", [id]);
    res.json({ success: true });
  } catch (e) {
    console.error("DELETE presenter error:", e);
    res.status(500).json({ error: "Failed to delete presenter" });
  }
}