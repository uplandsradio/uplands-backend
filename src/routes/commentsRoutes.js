// routes/commentsRoutes.js
const express = require('express');
const router = express.Router();
const ctrl = require('../controllers/commentsController');
const auth = require('../middleware/auth');

router.post('/', ctrl.postComment);
router.get('/', ctrl.getComments);
router.delete('/:id', auth, ctrl.deleteComment);

module.exports = router;