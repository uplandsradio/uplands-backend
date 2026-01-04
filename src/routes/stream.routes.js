import express from "express";
import fetch from "node-fetch";

const router = express.Router();

router.get("/health", async (_, res) => {
  try {
    const streamUrl = process.env.RADIO_STREAM;
    if (!streamUrl) throw new Error("No stream URL");

    const r = await fetch(streamUrl, { method: "HEAD", timeout: 4000 });

    res.json({
      ok: r.ok,
      status: r.status,
      ts: Date.now()
    });
  } catch {
    res.status(503).json({
      ok: false,
      ts: Date.now()
    });
  }
});

export default router;