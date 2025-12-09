// routes/fallback.js
const express = require('express');
const router = express.Router();
const fallbackPlayer = require('../utils/fallbackPlayer');

// Endpoint: GET current fallback stream info
router.get('/', (req, res) => {
  const info = fallbackPlayer.getCurrentStream();
  res.json(info);
});

// Optional: POST to change fallback stream
router.post('/set', (req, res) => {
  const { url } = req.body;
  if (!url) return res.status(400).json({ error: 'Stream URL required' });

  fallbackPlayer.setStream(url);
  res.json({ message: 'Fallback stream updated', currentStream: fallbackPlayer.getCurrentStream() });
});

// Optional: POST to play/stop fallback
router.post('/play', (req, res) => {
  fallbackPlayer.play();
  res.json({ message: 'Fallback stream playing', currentStream: fallbackPlayer.getCurrentStream() });
});

router.post('/stop', (req, res) => {
  fallbackPlayer.stop();
  res.json({ message: 'Fallback stream stopped', currentStream: fallbackPlayer.getCurrentStream() });
});

module.exports = router;