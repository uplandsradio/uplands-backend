import express from "express";
import pool from "../db.js";

const router = express.Router();

router.post("/check-admin", async (req, res) => {
  const { deviceId } = req.body;

  if (!deviceId) {
    return res.json({ isAdmin: false });
  }

  const result = await pool.query(
    `SELECT * FROM devices 
     WHERE device_id = $1 
     AND role = 'admin' 
     AND active = true`,
    [deviceId]
  );

  res.json({ isAdmin: result.rows.length > 0 });
});

export default router;