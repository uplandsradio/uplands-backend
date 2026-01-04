// routes/streamHealth.js
import express from "express";
import http from "http";
import https from "https";
import url from "url";

const router = express.Router();

router.get("/health", async (_, res) => {
  const streamUrl = process.env.RADIO_STREAM;
  if (!streamUrl) {
    return res.status(500).json({ status: "DOWN", reason: "No stream URL" });
  }

  try {
    const parsed = url.parse(streamUrl);
    const lib = parsed.protocol === "https:" ? https : http;

    const timeoutMs = 3000;
    const request = lib.request(
      {
        hostname: parsed.hostname,
        port: parsed.port || (parsed.protocol === "https:" ? 443 : 80),
        path: parsed.path,
        method: "GET",
        headers: {
          "Icy-MetaData": "1", // optional, for MP3 streams
        },
      },
      (response) => {
        // connection established, stream reachable
        response.destroy(); // we don't need data
        res.json({ status: "LIVE", checkedAt: new Date().toISOString() });
      }
    );

    request.on("error", () => {
      res.json({ status: "DOWN", checkedAt: new Date().toISOString() });
    });

    request.setTimeout(timeoutMs, () => {
      request.abort();
      res.json({ status: "DOWN", checkedAt: new Date().toISOString() });
    });

    request.end();
  } catch (err) {
    res.json({ status: "DOWN", checkedAt: new Date().toISOString() });
  }
});

export default router;