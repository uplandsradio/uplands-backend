import pool from "../config/db.js";

// ======================= GET ALL =======================
export async function getPresenters(req, res) {
  try {
    const r = await pool.query(
      "SELECT id, name, show_id, photo_url, bio FROM presenters ORDER BY id"
    );
    return res.json(r.rows);
  } catch (e) {
    console.error("GET presenters error:", e);
    return res.status(500).json({ error: "Failed to load presenters" });
  }
}

// ======================= CREATE =======================
export async function createPresenter(req, res) {
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

// ======================= UPDATE =======================
export async function updatePresenter(req, res) {
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

// ======================= DELETE =======================
export async function deletePresenter(req, res) {
  const { id } = req.params;

  try {
    await pool.query("DELETE FROM presenters WHERE id=$1", [id]);
    res.json({ success: true });
  } catch (e) {
    console.error("DELETE presenter error:", e);
    res.status(500).json({ error: "Failed to delete presenter" });
  }
}