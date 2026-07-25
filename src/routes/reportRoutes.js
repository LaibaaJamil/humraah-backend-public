const express = require('express');
const router = express.Router();
const ctrl = require('../controllers/reportController');
const { protect } = require('../middleware/auth');

router.post('/', protect, ctrl.submitReport);
router.get('/', ctrl.list);
router.get('/me', protect, ctrl.myReports);
router.get('/analytics', ctrl.analytics);
router.get('/national-impact', ctrl.nationalImpact);

module.exports = router;
