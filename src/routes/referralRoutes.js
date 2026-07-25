const express = require('express');
const router = express.Router();
const ctrl = require('../controllers/referralController');
const { protect } = require('../middleware/auth');

router.post('/', protect, ctrl.create);
router.get('/incoming', protect, ctrl.incoming);
router.get('/outgoing', protect, ctrl.outgoing);
router.put('/:id/respond', protect, ctrl.respond);

module.exports = router;
