const express = require('express');
const router = express.Router();

const ctrl = require('../controllers/resourceController');
const { protect, optionalAuth } = require('../middleware/auth');
const upload = require('../middleware/upload');

/**
 * PUBLIC + AUTH VIEWING
 */
router.get('/', optionalAuth, ctrl.list);
router.get('/stats/overview', ctrl.stats);
router.get('/:id', optionalAuth, ctrl.getById);

/**
 * ONLY NGO UPLOAD
 */
router.post('/', protect, upload.single('file'), ctrl.upload);

/**
 * DOWNLOAD
 */
router.post('/:id/download', ctrl.download);

/**
 * DELETE (OWNER or SUPER ADMIN)
 */
router.delete('/:id', protect, ctrl.remove);

module.exports = router;