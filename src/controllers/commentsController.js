// controllers/commentsController.js
const pool = require('../config/db');

// simple in-memory fallback when DB missing
let commentsFallback = [];

/**
 * POST COMMENT
 */
async function postComment(req, res) {
  const { username, message } = req.body;
  if (!message) return res.status(400).json({ error: 'Message required' });

  try {
    // insert into DB, ID comes from sequence automatically
    const deviceId = req.headers['x-device-id'] || `guest_${Date.now()}`;

const r = await pool.query(
  `
  INSERT INTO comments (username, message, approved, device_id, created_at)
  VALUES ($1, $2, $3, $4, NOW())
  RETURNING id, username, message, device_id, created_at, approved
  `,
  [username || 'Guest', message, false, deviceId]
);

    return res.json({
      ...r.rows[0],
      reports_count: 0, // new comment has no reports
    });
  } catch (e) {
    console.warn('post comment failed:', e.message);

    // fallback: keep in-memory
    const c = {
      id: Date.now(),
      username: username || 'Guest',
      message,
      created_at: new Date().toISOString(),
      approved: false,
      reports_count: 0,
    };

    commentsFallback.unshift(c);
    return res.json(c);
  }
}

/**
 * GET COMMENTS (WITH REPORT COUNTS)
 */
async function getComments(req, res) {
  try {
    const r = await pool.query(`
      SELECT 
        c.id,
        c.username,
        c.message,
        c.created_at,
        c.approved,
        COUNT(rp.id)::int AS reports_count
      FROM comments c
      LEFT JOIN comment_reports rp 
        ON rp.comment_id = c.id
      GROUP BY c.id, c.username, c.message, c.created_at, c.approved
      ORDER BY c.created_at DESC
    `);

    return res.json(r.rows);
  } catch (e) {
    console.warn('comments fetch failed:', e.message);

    // fallback: ensure structure matches frontend expectations
    const safeFallback = commentsFallback.map(c => ({
      ...c,
      reports_count: c.reports_count ?? 0,
    }));

    return res.json(safeFallback);
  }
}

/**
 * DELETE COMMENT (ADMIN ONLY)
 */
async function deleteComment(req, res) {
  const { id } = req.params;

  try {
    await pool.query('DELETE FROM comments WHERE id = $1', [id]);
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

/**
 * REPORT COMMENT
 */
async function reportComment(req, res) {
  const { commentId, reason } = req.body;
  if (!commentId) return res.status(400).json({ error: 'commentId required' });

  // get device id from header (fallback for guests)
  const deviceId = req.headers['x-device-id'] || `guest_${Date.now()}`;

  try {
    const r = await pool.query(
      `
      INSERT INTO comment_reports (comment_id, device_id, reason)
      VALUES ($1, $2, $3)
      RETURNING *
      `,
      [commentId, deviceId, reason || 'Inappropriate']
    );

    return res.json(r.rows[0]);
  } catch (e) {
    console.warn('report comment failed:', e.message);
    return res.status(500).json({ error: 'Failed to report comment' });
  }
}

module.exports = {
  postComment,
  getComments,
  deleteComment,
  reportComment, // 🔹 export reportComment
};