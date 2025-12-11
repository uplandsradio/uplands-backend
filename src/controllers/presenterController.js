import pool from "../config/db.js";

export async function getPresenters(req, res) {
  try {
    const r = await pool.query(
      "SELECT id, name, show_id FROM presenters ORDER BY id"
    );
    return res.json(r.rows);
  } catch (e) {
    return res.status(500).json({ error: "Failed to load presenters" });
  }
}

export async function createPresenter(req, res) {
  const { name, show_id } = req.body;
  try {
    const r = await pool.query(
      "INSERT INTO presenters(name, show_id) VALUES($1,$2) RETURNING *",
      [name, show_id]
    );
    res.json(r.rows[0]);
  } catch (e) {
    res.status(500).json({ error: "Failed to add presenter" });
  }
}

export async function updatePresenter(req, res) {
  const { id } = req.params;
  const { name, show_id } = req.body;

  try {
    const r = await pool.query(
      "UPDATE presenters SET name=$1, show_id=$2 WHERE id=$3 RETURNING *",
      [name, show_id, id]
    );
    res.json(r.rows[0]);
  } catch (e) {
    res.status(500).json({ error: "Failed to update presenter" });
  }
}

export async function deletePresenter(req, res) {
  const { id } = req.params;

  try {
    await pool.query("DELETE FROM presenters WHERE id=$1", [id]);
    res.json({ success: true });
  } catch (e) {
    res.status(500).json({ error: "Failed to delete presenter" });
  }
}