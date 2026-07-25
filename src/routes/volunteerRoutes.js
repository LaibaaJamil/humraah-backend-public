const express = require('express');
const router = express.Router();
const ctrl = require('../controllers/volunteerController');
const { protect } = require('../middleware/auth');

router.post('/', protect, ctrl.create);
router.get('/me', protect, ctrl.mine);
router.get('/ngo', protect, ctrl.forNgo);
router.put('/:id/respond', protect, ctrl.respond);

module.exports = router;
