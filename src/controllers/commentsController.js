// controllers/commentsController.js
const pool = require('../config/db');

// simple in-memory fallback when DB missing
let commentsFallback = [];

async function postComment(req, res) {
  const { username, message } = req.body;
  if (!message) return res.status(400).json({ error: 'Message required' });

  try {
    const r = await pool.query(
      'INSERT INTO comments(username,message,approved,created_at) VALUES($1,$2,$3,NOW()) RETURNING *',
      [username || 'Guest', message, false]
    );
    return res.json(r.rows[0]);
  } catch (e) {
    // fallback: keep in-memory
    const c = { id: Date.now(), username: username || 'Guest', message, created_at: new Date().toISOString(), approved: false };
    commentsFallback.unshift(c);
    return res.json(c);
  }
}

async function getComments(req, res) {
  try {
    const r = await pool.query('SELECT id, username, message, created_at, approved FROM comments ORDER BY created_at DESC');
    if (r && r.rows) return res.json(r.rows);
  } catch (e) {
    console.warn('comments fetch failed:', e.message);
  }
  return res.json(commentsFallback);
}

async function deleteComment(req, res) {
  const { id } = req.params;
  try {
    await pool.query('DELETE FROM comments WHERE id=$1', [id]);
    return res.json({ success: true });
  } catch (e) {
    console.warn('delete comment failed:', e.message);
    // fallback: remove from in-memory if present
    const idx = commentsFallback.findIndex(c => c.id === parseInt(id));
    if (idx !== -1) {
      commentsFallback.splice(idx, 1);
      return res.json({ success: true });
    }
    return res.status(500).json({ error: 'Failed to delete comment' });
  }
}

module.exports = {
  postComment,
  getComments,
  deleteComment,
};