const express = require('express');
const router = express.Router();
const ctrl = require('../controllers/mapController');
const { protect, authorize, optionalAuth } = require('../middleware/auth');

// PUBLIC LISTING with optional auth - logged-in NGO/admin users see more pins
router.get('/', optionalAuth, ctrl.list);

// HEATMAP (optional public or logged-in)
router.get('/heatmap', ctrl.heatmap);

// CREATE PIN (any logged-in user)
router.post('/', protect, ctrl.create);

// UPDATE PIN (owner or admin logic handled inside controller)
router.put('/:id', protect, ctrl.update);

// RESPOND TO PIN (NGO or admin)
router.post('/:id/respond', protect, authorize('ngo_admin', 'ngo_staff', 'super_admin'), ctrl.respond);

// DELETE PIN (only admin or owner logic in controller)
router.delete('/:id', protect, authorize('super_admin', 'ngo_admin'), ctrl.remove);


// =======================
// NEW ADDED ROUTES (IMPORTANT)
// =======================

// GET PENDING PINS (ONLY ADMIN TYPES)
router.get(
  '/pending',
  protect,
  authorize('super_admin', 'ngo_admin', 'ngo_staff'),
  ctrl.pendingPins
);

// VERIFY PIN
router.patch(
  '/:id/verify',
  protect,
  authorize('super_admin', 'ngo_admin'),
  ctrl.verifyPin
);

// REJECT PIN
router.patch(
  '/:id/reject',
  protect,
  authorize('super_admin', 'ngo_admin'),
  ctrl.rejectPin
);

module.exports = router;