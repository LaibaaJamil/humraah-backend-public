const NGO = require('../models/NGO');
const User = require('../models/User');
const { createNotification } = require('../utils/notify');

exports.list = async (req, res, next) => {
  try {
    const { status, sector, city, search, page = 1, limit = 20 } = req.query;
    const filter = {};
    if (status) filter.verificationStatus = status;
    if (sector) filter.sectors = sector;
    if (city) filter.city = new RegExp(city, 'i');
    if (search) filter.$text = { $search: search };

    const skip = (Number(page) - 1) * Number(limit);
    const [ngos, total] = await Promise.all([
      NGO.find(filter)
        .populate('owner', 'name email phone')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(Number(limit)),
      NGO.countDocuments(filter),
    ]);

    res.json({
      success: true,
      data: ngos,
      pagination: {
        page: Number(page),
        limit: Number(limit),
        total,
        pages: Math.ceil(total / Number(limit)),
      },
    });
  } catch (err) {
    next(err);
  }
};

exports.getById = async (req, res, next) => {
  try {
    const ngo = await NGO.findById(req.params.id).populate('owner', 'name email phone');
    if (!ngo) return res.status(404).json({ success: false, message: 'NGO not found' });
    res.json({ success: true, data: ngo });
  } catch (err) {
    next(err);
  }
};

exports.create = async (req, res, next) => {
  try {
    const data = { ...req.body, owner: req.user._id, verificationStatus: 'pending' };
    if (req.files) {
      if (req.files.logo) data.logo = `/uploads/${req.files.logo[0].filename}`;
      if (req.files.legalCertificate)
        data.legalCertificate = `/uploads/${req.files.legalCertificate[0].filename}`;
    }
    const ngo = await NGO.create(data);
    await User.findByIdAndUpdate(req.user._id, { ngo: ngo._id, role: 'ngo_admin' });
    res.status(201).json({ success: true, data: ngo });
  } catch (err) {
    next(err);
  }
};

exports.update = async (req, res, next) => {
  try {
    const ngo = await NGO.findById(req.params.id);
    if (!ngo) return res.status(404).json({ success: false, message: 'NGO not found' });
    if (
      req.user.role !== 'super_admin' &&
      ngo.owner.toString() !== req.user._id.toString()
    ) {
      return res.status(403).json({ success: false, message: 'Not authorized' });
    }
    const data = { ...req.body };
    if (req.files) {
      if (req.files.logo) data.logo = `/uploads/${req.files.logo[0].filename}`;
      if (req.files.legalCertificate)
        data.legalCertificate = `/uploads/${req.files.legalCertificate[0].filename}`;
    }
    const updated = await NGO.findByIdAndUpdate(req.params.id, data, {
      new: true,
      runValidators: true,
    });
    res.json({ success: true, data: updated });
  } catch (err) {
    next(err);
  }
};

exports.verify = async (req, res, next) => {
  try {
    const { status, rejectionReason } = req.body;
    if (!['verified', 'rejected'].includes(status)) {
      return res.status(400).json({ success: false, message: 'Invalid status' });
    }
    const update = {
      verificationStatus: status,
      verifiedAt: new Date(),
      verifiedBy: req.user._id,
    };
    if (status === 'rejected') update.rejectionReason = rejectionReason || 'Not specified';
    const ngo = await NGO.findByIdAndUpdate(req.params.id, update, { new: true });
    if (!ngo) return res.status(404).json({ success: false, message: 'NGO not found' });

    // Notify the NGO owner so they actually know what happened to their application
    if (ngo.owner) {
      const title = status === 'verified' ? '✅ Your NGO has been verified!' : '❌ NGO application rejected';
      const message = status === 'verified'
        ? `${ngo.name} has been verified. You now have full access to NGO features.`
        : `${ngo.name} was not approved. Reason: ${update.rejectionReason || 'Not specified'}`;
      await createNotification({
        user: ngo.owner,
        title,
        message,
        type: status === 'verified' ? 'success' : 'warning',
        relatedEntity: ngo._id,
        relatedModel: 'NGO',
        actionUrl: '/my-ngo',
      });
      const io = req.app.get('io');
      if (io) io.to(ngo.owner.toString()).emit('notification', { title, message, type: status === 'verified' ? 'success' : 'warning' });
    }

    res.json({ success: true, data: ngo });
  } catch (err) {
    next(err);
  }
};

exports.myNGO = async (req, res, next) => {
  try {
    if (!req.user.ngo) {
      return res.status(404).json({ success: false, message: 'No NGO associated' });
    }
    const ngo = await NGO.findById(req.user.ngo._id || req.user.ngo).populate(
      'owner',
      'name email phone'
    );
    res.json({ success: true, data: ngo });
  } catch (err) {
    next(err);
  }
};

exports.remove = async (req, res, next) => {
  try {
    const ngo = await NGO.findByIdAndDelete(req.params.id);
    if (!ngo) return res.status(404).json({ success: false, message: 'NGO not found' });
    res.json({ success: true, message: 'NGO removed' });
  } catch (err) {
    next(err);
  }
};

// GET /ngos/:id/projects - Get all map pins/projects for an NGO (for large org evaluation)
exports.getNGOProjects = async (req, res, next) => {
  try {
    const MapPin = require('../models/MapPin');
    const Report = require('../models/Report');
    const Application = require('../models/Application');

    const [pins, reports, applications] = await Promise.all([
      MapPin.find({ ngo: req.params.id, verificationStatus: 'verified' })
        .sort({ createdAt: -1 })
        .limit(50),
      Report.find({ ngo: req.params.id })
        .sort({ createdAt: -1 })
        .limit(20),
      Application.find({ ngo: req.params.id })
        .populate('tender', 'title budgetAmount status')
        .sort({ createdAt: -1 })
        .limit(20),
    ]);

    res.json({
      success: true,
      data: {
        projects: pins,
        reports,
        tenderApplications: applications,
        summary: {
          totalProjects: pins.length,
          resolvedProjects: pins.filter(p => p.status === 'resolved').length,
          activeProjects: pins.filter(p => p.status === 'active' || p.status === 'in_progress').length,
          totalReports: reports.length,
          totalApplications: applications.length,
        }
      }
    });
  } catch (err) {
    next(err);
  }
};
