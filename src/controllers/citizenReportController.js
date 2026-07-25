const CitizenReport = require('../models/CitizenReport');
const User = require('../models/User');
const { createNotification, notifyMany } = require('../utils/notify');

// Safe trust update - won't crash if utility missing
const tryUpdateTrust = async (userId, action) => {
  try {
    const { updateTrustScore } = require('../utils/trustEngine');
    await updateTrustScore({ userId, action });
  } catch (_) {}
};

exports.create = async (req, res, next) => {
  try {
    const report = await CitizenReport.create({
      ...req.body,
      submittedBy: req.user._id,
      status: 'pending',
    });

    // Notify all super admins + ngo_admins
    const admins = await User.find({
      role: { $in: ['super_admin', 'ngo_admin'] },
      isActive: true,
    }).select('_id');

    if (admins.length > 0) {
      await notifyMany(admins.map((u) => u._id), {
        title: 'New Citizen Report',
        message: `${req.user.name} submitted a report requiring verification`,
        type: 'flag',
        relatedEntity: report._id,
        relatedModel: 'CitizenReport',
        actionUrl: '/admin/pending',
      });
      const io = req.app.get('io');
      if (io) admins.forEach((u) => io.to(u._id.toString()).emit('notification', {
        title: 'New Citizen Report',
        message: `${req.user.name} submitted a report`,
        type: 'flag',
      }));
    }

    res.status(201).json({ success: true, data: report });
  } catch (err) { next(err); }
};

exports.list = async (req, res, next) => {
  try {
    const { status } = req.query;
    const filter = {};
    if (status) filter.status = status;
    const reports = await CitizenReport.find(filter)
      .populate('submittedBy', 'name email phone')
      .populate('verifiedBy', 'name')
      .sort({ createdAt: -1 });
    res.json({ success: true, data: reports });
  } catch (err) { next(err); }
};

exports.getOne = async (req, res, next) => {
  try {
    const report = await CitizenReport.findById(req.params.id)
      .populate('submittedBy', 'name email phone')
      .populate('verifiedBy', 'name');
    if (!report) return res.status(404).json({ success: false, message: 'Not found' });
    res.json({ success: true, data: report });
  } catch (err) { next(err); }
};

exports.verify = async (req, res, next) => {
  try {
    const report = await CitizenReport.findById(req.params.id);
    if (!report) return res.status(404).json({ success: false, message: 'Not found' });
    const { notes } = req.body;
    report.status = 'verified';
    report.verifiedBy = req.user._id;
    report.verifiedAt = new Date();
    if (notes) report.verificationNotes = notes;
    await report.save();
    await tryUpdateTrust(report.submittedBy, 'REPORT_VERIFIED');

    await createNotification({
      user: report.submittedBy,
      title: '✅ Your report was verified',
      message: notes || 'Your submitted report has been verified by our team.',
      type: 'success',
      relatedEntity: report._id,
      relatedModel: 'CitizenReport',
    });
    const io = req.app.get('io');
    if (io) io.to(report.submittedBy.toString()).emit('notification', {
      title: '✅ Your report was verified',
      message: notes || 'Your report has been verified.',
      type: 'success',
    });

    res.json({ success: true, data: report });
  } catch (err) { next(err); }
};

exports.reject = async (req, res, next) => {
  try {
    const report = await CitizenReport.findById(req.params.id);
    if (!report) return res.status(404).json({ success: false, message: 'Not found' });
    const { notes } = req.body;
    report.status = 'rejected';
    report.verifiedBy = req.user._id;
    report.verifiedAt = new Date();
    if (notes) report.verificationNotes = notes;
    await report.save();
    await tryUpdateTrust(report.submittedBy, 'REPORT_REJECTED');

    await createNotification({
      user: report.submittedBy,
      title: 'Report not approved',
      message: notes || 'Your submitted report could not be verified at this time.',
      type: 'warning',
      relatedEntity: report._id,
      relatedModel: 'CitizenReport',
    });

    res.json({ success: true, data: report });
  } catch (err) { next(err); }
};
