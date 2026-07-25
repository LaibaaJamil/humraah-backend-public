const express = require('express');
const router = express.Router();
const ctrl = require('../controllers/citizenReportController');
const { protect, authorize } = require('../middleware/auth');

router.post('/', protect, ctrl.create);
router.get('/', protect, authorize('super_admin', 'ngo_admin', 'ngo_staff'), ctrl.list);
router.get('/:id', protect, authorize('super_admin', 'ngo_admin', 'ngo_staff'), ctrl.getOne);
router.put('/:id/verify', protect, authorize('super_admin', 'ngo_admin'), ctrl.verify);
router.put('/:id/reject', protect, authorize('super_admin', 'ngo_admin'), ctrl.reject);

module.exports = router;
