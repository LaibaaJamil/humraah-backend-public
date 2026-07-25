const express = require('express');
const router = express.Router();
const ctrl = require('../controllers/notificationController');
const { protect } = require('../middleware/auth');

router.get('/', protect, ctrl.list);
router.put('/read-all', protect, ctrl.markAllRead);   // MUST be before /:id
router.put('/:id/read', protect, ctrl.markRead);
router.delete('/:id', protect, ctrl.remove);

module.exports = router;
