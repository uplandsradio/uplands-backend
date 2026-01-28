import express from "express";

const router = express.Router();

export default function reportRoutes(pool) {

  // --------------------------------------------------
  // REPORT COMMENT (USER)
  // --------------------------------------------------
  router.post("/report-comment", async (req, res) => {
    try {
      const { commentId, reason } = req.body;

      if (!commentId) {
        return res.status(400).json({ error: "commentId required" });
      }

      await pool.query(
        `INSERT INTO comment_reports (comment_id, reason)
         VALUES ($1, $2)`,
        [commentId, reason || "inappropriate"]
      );

      res.json({ success: true });
    } catch (err) {
      console.error("REPORT ERROR:", err);
      res.status(500).json({ error: "Failed to report comment" });
    }
  });

  // --------------------------------------------------
  // VIEW REPORTED COMMENTS (ADMIN – OPTIONAL)
  // --------------------------------------------------
  router.get("/reported-comments", async (req, res) => {
    try {
      const r = await pool.query(
        `SELECT * FROM comment_reports ORDER BY created_at DESC`
      );
      res.json(r.rows);
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: "Failed to fetch reports" });
    }
  });

  return router;
}