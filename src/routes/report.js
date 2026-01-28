import express from "express";

const router = express.Router();

export default function reportRoutes(pool) {
  // --------------------------------------------------
  // 1️⃣ REPORT COMMENT (USER)
  // --------------------------------------------------
  router.post("/report-comment", async (req, res) => {
    try {
      const { commentId, reason } = req.body;

      if (commentId == null) {
        return res.status(400).json({ error: "commentId required" });
      }

      const r = await pool.query(
        `INSERT INTO comment_reports (comment_id, reason)
         VALUES ($1, $2) RETURNING id`,
        [commentId, reason || "Inappropriate"]
      );

      res.json({ success: true, reportId: r.rows[0].id });
    } catch (err) {
      console.error("REPORT ERROR:", err);
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