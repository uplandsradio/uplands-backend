import pool from "../config/db.js";

export async function getPresenters(req, res) {
  try {
    const r = await pool.query(
      "SELECT id, name, show_id, photo_url, bio FROM presenters ORDER BY id"
    );
    return res.json(r.rows);
  } catch (e) {
    return res.status(500).json({ error: "Failed to load presenters" });
  }
}

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
    console.error("❌ CREATE PRESENTER ERROR:", e);
    res.status(500).json({ error: "Failed to add presenter" });
  }
}

export async function updatePresenter(req, res) {
  const { id } = req.params;
  const { name, show_id, photo_url, bio } = req.body;

  try {
    const r = await pool.query(
      `UPDATE presenters
       SET
         name = COALESCE($1, name),
         show_id = CASE 
                     WHEN $2 IS NULL OR $2 = '' THEN show_id
                     ELSE $2::int
                   END,
         photo_url = COALESCE($3, photo_url),
         bio = COALESCE($4, bio)
       WHERE id = $5
       RETURNING *`,
      [name, show_id, photo_url, bio, id]
    );

    res.json(r.rows[0]);
  } catch (e) {
    console.error("❌ UPDATE PRESENTER ERROR:", e);
    res.status(500).json({ error: "Failed to update presenter" });
  }
}

export async function deletePresenter(req, res) {
  const { id } = req.params;

  try {
    await pool.query("DELETE FROM presenters WHERE id=$1", [id]);
    res.json({ success: true });
  } catch (e) {
    console.error("❌ DELETE PRESENTER ERROR:", e);
    res.status(500).json({ error: "Failed to delete presenter" });
  }
}