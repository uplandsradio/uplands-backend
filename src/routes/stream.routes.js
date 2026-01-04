import express from "express";
import fetch from "node-fetch";

const router = express.Router();

router.get("/health", async (_, res) => {
  try {
    const streamUrl = process.env.RADIO_STREAM;
    if (!streamUrl) throw new Error("No stream URL");

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 4000);

    const r = await fetch(streamUrl, {
      method: "HEAD",
      signal: controller.signal
    });

    clearTimeout(timeout);

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