// routes/streamRoutes.js
const express = require('express');
const router = express.Router();
const ctrl = require('../controllers/streamController');

router.get('/live-stream', ctrl.getLiveStream);
router.get('/get-current-stream', ctrl.getLiveStream); // legacy alias

module.exports = router;