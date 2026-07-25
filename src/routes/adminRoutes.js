const express = require('express');
const router = express.Router();
const ctrl = require('../controllers/adminController');
const { protect, authorize } = require('../middleware/auth');

router.use(protect, authorize('super_admin'));

router.get('/dashboard', ctrl.dashboard);
router.get('/users', ctrl.listUsers);
router.put('/users/:id/toggle', ctrl.toggleUserActive);
router.put('/users/:id/role', ctrl.changeUserRole);
router.put('/users/:id/mark-donor', ctrl.markAsDonor);
router.put('/users/:id/assign-ngo', ctrl.assignStaffToNgo);
router.put('/users/:id/toggle-large-org', ctrl.toggleLargeOrg);
router.get('/verifications/pending', ctrl.pendingVerifications);
router.get('/donors', ctrl.listDonors);

module.exports = router;
