const express = require('express');
const router = express.Router();

// helper to get DB pool
function getPool(req){ return req.app.get('db'); }

// GET /api/presenters - list all presenters
router.get('/', async (req, res) => {
  const pool = getPool(req);
  if (!pool) return res.status(500).json({ error: 'DB not initialized' });
  try {
    const r = await pool.query(
      `SELECT p.*, s.title AS show_title
       FROM presenters p
       LEFT JOIN shows s ON p.show_id = s.id
       ORDER BY p.created_at DESC`
    );
    res.json(r.rows);
  } catch (e) {
    console.error('GET presenters error', e.message);
    res.status(500).json({ error: 'db error' });
  }
});

// GET /api/presenters/:id
router.get('/:id', async (req, res) => {
  const pool = getPool(req);
  try {
    const r = await pool.query('SELECT * FROM presenters WHERE id=$1', [req.params.id]);
    if (r.rows.length === 0) return res.status(404).json({ error: 'not found' });
    res.json(r.rows[0]);
  } catch (e) {
    res.status(500).json({ error: 'db error' });
  }
});

// POST /api/presenters - create
router.post('/', async (req, res) => {
  const pool = getPool(req);
  const { name, show_id, photo_url, bio } = req.body;
  if (!name) return res.status(400).json({ error: 'name required' });

  try {
    const r = await pool.query(
      'INSERT INTO presenters(name, show_id, photo_url, bio) VALUES($1,$2,$3,$4) RETURNING *',
      [name, show_id || null, photo_url || null, bio || null]
    );
    res.status(201).json(r.rows[0]);
  } catch (e) {
    console.error('POST presenters error', e.message);
    res.status(500).json({ error: 'db error' });
  }
});

// PUT /api/presenters/:id - update
router.put('/:id', async (req, res) => {
  const pool = getPool(req);
  const { name, show_id, photo_url, bio } = req.body;
  if (!name) return res.status(400).json({ error: 'name required' });

  try {
    const r = await pool.query(
      'UPDATE presenters SET name=$1, show_id=$2, photo_url=$3, bio=$4 WHERE id=$5 RETURNING *',
      [name, show_id || null, photo_url || null, bio || null, req.params.id]
    );
    if (r.rows.length === 0) return res.status(404).json({ error: 'not found' });
    res.json(r.rows[0]);
  } catch (e) {
    console.error('PUT presenters error', e.message);
    res.status(500).json({ error: 'db error' });
  }
});

// DELETE /api/presenters/:id
router.delete('/:id', async (req, res) => {
  const pool = getPool(req);
  try {
    await pool.query('DELETE FROM presenters WHERE id=$1', [req.params.id]);
    res.json({ ok: true });
  } catch (e) {
    console.error('DELETE presenters error', e.message);
    res.status(500).json({ error: 'db error' });
  }
});

module.exports = router;