import express from "express";

const router = express.Router();

export default function reportRoutes(pool) {

  // --------------------------------------------------
  // 1️⃣ REPORT COMMENT (USER)
  // --------------------------------------------------
  router.post("/report-comment", async (req, res) => {
  try {
    const deviceId = req.headers['x-device-id'];
    const commentId = parseInt(req.body.commentId, 10); // 🔹 convert to int
    const reason = req.body.reason || "Inappropriate";

    console.log("REPORT COMMENT → deviceId", deviceId, "commentId", commentId);

    if (!commentId || !deviceId) {
      return res.status(400).json({ error: "commentId and deviceId required" });
    }

    // Check if comment exists
    const commentCheck = await pool.query(
      `SELECT id FROM comments WHERE id=$1`, [commentId]
    );
    if (!commentCheck.rows.length) return res.status(404).json({ error: "Comment not found" });

    // Insert report
    const r = await pool.query(
      `INSERT INTO comment_reports(comment_id, device_id, reason, created_at)
       VALUES($1, $2, $3, NOW())
       RETURNING id`,
      [commentId, deviceId, reason]
    );

    res.json({ success: true, reportId: r.rows[0].id });
  } catch (err) {
    console.error("REPORT COMMENT ERROR:", err);
    if (err.code === '23505') { // duplicate
      return res.status(400).json({ error: "You already reported this comment" });
    }
    res.status(500).json({ error: "Failed to report comment" });
  }
});

  // --------------------------------------------------
  // 2️⃣ GET REPORTED COMMENTS COUNT (FOR CLIENT)
  // --------------------------------------------------
  router.get("/comments/:id/reports/count", async (req, res) => {
    try {
      const commentId = req.params.id;

      const r = await pool.query(
        `SELECT COUNT(*) FROM comment_reports WHERE comment_id = $1`,
        [commentId]
      );

      res.json({ count: parseInt(r.rows[0].count, 10) });
    } catch (err) {
      console.error("GET REPORT COUNT ERROR:", err);
      res.status(500).json({ error: "Failed to fetch report count" });
    }
  });

  // --------------------------------------------------
  // 3️⃣ VIEW ALL REPORTED COMMENTS (ADMIN – OPTIONAL)
  // --------------------------------------------------
  router.get("/reported-comments", async (req, res) => {
    try {
      const r = await pool.query(
        `SELECT cr.id, cr.comment_id, cr.reason, cr.created_at,
                c.username, c.message
         FROM comment_reports cr
         LEFT JOIN comments c ON cr.comment_id = c.id
         ORDER BY cr.created_at DESC`
      );

      res.json(r.rows);
    } catch (err) {
      console.error("FETCH REPORTED COMMENTS ERROR:", err);
      res.status(500).json({ error: "Failed to fetch reports" });
    }
  });

  return router;
}