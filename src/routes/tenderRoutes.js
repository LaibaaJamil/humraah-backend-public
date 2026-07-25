const express = require('express');
const router = express.Router();
const ctrl = require('../controllers/tenderController');
const { protect, authorize } = require('../middleware/auth');

router.get('/', ctrl.listTenders);
router.get('/applications/me', protect, ctrl.myApplications);
router.get('/:id', ctrl.getTender);
router.post('/', protect, authorize('donor'), ctrl.createTender);
router.put('/:id', protect, ctrl.updateTender);
router.delete('/:id', protect, ctrl.removeTender);
router.post('/:id/apply', protect, ctrl.applyToTender);
router.get('/:id/applications', protect, ctrl.listApplications);
router.put('/applications/:appId', protect, ctrl.updateApplication);

module.exports = router;
