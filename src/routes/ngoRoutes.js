const express = require('express');
const router = express.Router();
const ctrl = require('../controllers/ngoController');
const { protect, authorize } = require('../middleware/auth');
const upload = require('../middleware/upload');

const ngoUpload = upload.fields([
  { name: 'logo', maxCount: 1 },
  { name: 'legalCertificate', maxCount: 1 },
]);

router.get('/', ctrl.list);
router.get('/me/details', protect, ctrl.myNGO);
router.get('/:id/projects', protect, ctrl.getNGOProjects); // For large orgs to evaluate NGOs
router.get('/:id', ctrl.getById);
router.post('/', protect, ngoUpload, ctrl.create);
router.put('/:id', protect, ngoUpload, ctrl.update);
router.put('/:id/verify', protect, authorize('super_admin'), ctrl.verify);
router.delete('/:id', protect, authorize('super_admin'), ctrl.remove);

module.exports = router;
