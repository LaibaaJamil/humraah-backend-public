const Tender = require('../models/Tender');
const Application = require('../models/Application');
const NGO = require('../models/NGO');
const User = require('../models/User');
const { notifyMany, createNotification } = require('../utils/notify');

exports.listTenders = async (req, res, next) => {
  try {
    const { status, sector, search, page = 1, limit = 20 } = req.query;
    const filter = {};
    if (status) filter.status = status;
    if (sector) filter.sector = sector;
    if (search) filter.$or = [
      { title: new RegExp(search, 'i') },
      { description: new RegExp(search, 'i') },
    ];
    const skip = (Number(page) - 1) * Number(limit);
    const [items, total] = await Promise.all([
      Tender.find(filter).populate('postedBy', 'name email').sort({ createdAt: -1 }).skip(skip).limit(Number(limit)),
      Tender.countDocuments(filter),
    ]);
    res.json({ success: true, data: items, pagination: { page: Number(page), limit: Number(limit), total, pages: Math.ceil(total / Number(limit)) } });
  } catch (err) { next(err); }
};

exports.getTender = async (req, res, next) => {
  try {
    const tender = await Tender.findById(req.params.id).populate('postedBy', 'name email').populate('awardedTo', 'name logo');
    if (!tender) return res.status(404).json({ success: false, message: 'Tender not found' });
    res.json({ success: true, data: tender });
  } catch (err) { next(err); }
};

exports.createTender = async (req, res, next) => {
  try {
    if (req.user.role !== 'donor') return res.status(403).json({ success: false, message: 'Only donor organizations can post tenders' });
    if (!req.user.isLargeOrg) return res.status(403).json({ success: false, message: 'Only large verified organizations can post tenders.' });
    const tender = await Tender.create({ ...req.body, postedBy: req.user._id });
    const ngoAdmins = await User.find({ role: 'ngo_admin', isActive: true }).select('_id');
    if (ngoAdmins.length > 0) {
      await notifyMany(ngoAdmins.map((u) => u._id), {
        title: '💰 New Funding Opportunity',
        message: `${tender.title} — PKR ${tender.budgetAmount.toLocaleString()}`,
        type: 'tender', relatedEntity: tender._id, relatedModel: 'Tender', actionUrl: `/tenders/${tender._id}`,
      });
      const io = req.app.get('io');
      if (io) ngoAdmins.forEach((u) => io.to(u._id.toString()).emit('notification', { title: 'New Tender Posted', message: tender.title, type: 'tender' }));
    }
    res.status(201).json({ success: true, data: tender });
  } catch (err) { next(err); }
};

exports.updateTender = async (req, res, next) => {
  try {
    const tender = await Tender.findById(req.params.id);
    if (!tender) return res.status(404).json({ success: false, message: 'Tender not found' });
    if (tender.postedBy.toString() !== req.user._id.toString() && req.user.role !== 'super_admin')
      return res.status(403).json({ success: false, message: 'Not authorized' });
    Object.assign(tender, req.body);
    await tender.save();
    res.json({ success: true, data: tender });
  } catch (err) { next(err); }
};

exports.removeTender = async (req, res, next) => {
  try {
    const tender = await Tender.findById(req.params.id);
    if (!tender) return res.status(404).json({ success: false, message: 'Tender not found' });
    if (tender.postedBy.toString() !== req.user._id.toString() && req.user.role !== 'super_admin')
      return res.status(403).json({ success: false, message: 'Not authorized' });
    await tender.deleteOne();
    res.json({ success: true, message: 'Tender removed' });
  } catch (err) { next(err); }
};

exports.applyToTender = async (req, res, next) => {
  try {
    const tender = await Tender.findById(req.params.id);
    if (!tender) return res.status(404).json({ success: false, message: 'Tender not found' });
    if (tender.status !== 'open') return res.status(400).json({ success: false, message: 'Tender is not open' });
    if (!req.user.ngo) return res.status(400).json({ success: false, message: 'Only NGO members can apply' });
    const ngoId = req.user.ngo._id || req.user.ngo;
    const ngo = await NGO.findById(ngoId);
    if (!ngo || ngo.verificationStatus !== 'verified') return res.status(400).json({ success: false, message: 'NGO must be verified' });
    const exists = await Application.findOne({ tender: req.params.id, applicantNGO: ngoId });
    if (exists) return res.status(400).json({ success: false, message: 'Already applied' });
    const application = await Application.create({
      tender: req.params.id, applicantNGO: ngoId,
      coalitionPartners: req.body.coalitionPartners || [],
      proposalSummary: req.body.proposalSummary,
      proposalFile: req.body.proposalFile || '',
      requestedAmount: req.body.requestedAmount,
      timelineMonths: req.body.timelineMonths || 12,
      submittedBy: req.user._id,
    });
    // Notify donor who posted the tender
    await createNotification({
      user: tender.postedBy,
      title: '📋 New Application Received',
      message: `${ngo.name} applied to "${tender.title}"`,
      type: 'tender', relatedEntity: tender._id, relatedModel: 'Tender',
      actionUrl: `/tenders/${tender._id}`,
    });
    const io = req.app.get('io');
    if (io) io.to(tender.postedBy.toString()).emit('notification', { title: 'New Application', message: `${ngo.name} applied to your tender`, type: 'tender' });
    res.status(201).json({ success: true, data: application });
  } catch (err) { next(err); }
};

exports.listApplications = async (req, res, next) => {
  try {
    const tender = await Tender.findById(req.params.id);
    if (!tender) return res.status(404).json({ success: false, message: 'Tender not found' });
    if (req.user.role !== 'super_admin' && tender.postedBy.toString() !== req.user._id.toString())
      return res.status(403).json({ success: false, message: 'Not authorized' });
    const apps = await Application.find({ tender: req.params.id })
      .populate({ path: 'applicantNGO', select: 'name logo verificationStatus sector province city description website' })
      .populate('coalitionPartners', 'name logo')
      .populate('submittedBy', 'name email phone');
    res.json({ success: true, data: apps });
  } catch (err) { next(err); }
};

exports.myApplications = async (req, res, next) => {
  try {
    if (!req.user.ngo) return res.json({ success: true, data: [] });
    const ngoId = req.user.ngo._id || req.user.ngo;
    const apps = await Application.find({ applicantNGO: ngoId }).populate('tender').populate('coalitionPartners', 'name').sort({ createdAt: -1 });
    res.json({ success: true, data: apps });
  } catch (err) { next(err); }
};

exports.updateApplication = async (req, res, next) => {
  try {
    const app = await Application.findById(req.params.appId).populate('tender');
    if (!app) return res.status(404).json({ success: false, message: 'Application not found' });
    if (req.user.role !== 'super_admin' && app.tender.postedBy.toString() !== req.user._id.toString())
      return res.status(403).json({ success: false, message: 'Not authorized' });

    const prevStatus = app.status;
    if (req.body.status) app.status = req.body.status;
    if (req.body.feedback !== undefined) app.feedback = req.body.feedback;
    await app.save();

    // If awarding — update tender status + notify NGO
    if (req.body.status === 'awarded' && prevStatus !== 'awarded') {
      const tender = app.tender;
      tender.status = 'awarded';
      tender.awardedAt = new Date();
      if (!tender.awardedTo) tender.awardedTo = [];
      if (!tender.awardedTo.map(id => id.toString()).includes(app.applicantNGO.toString())) {
        tender.awardedTo.push(app.applicantNGO);
      }
      await tender.save();

      // Get NGO admin/staff to notify
      const ngoUsers = await User.find({ ngo: app.applicantNGO, role: { $in: ['ngo_admin', 'ngo_staff'] }, isActive: true }).select('_id');
      if (ngoUsers.length > 0) {
        await notifyMany(ngoUsers.map(u => u._id), {
          title: '🏆 Tender Awarded!',
          message: `Congratulations! Your NGO has been awarded "${tender.title}". Please check the tender for next steps.`,
          type: 'success', relatedEntity: tender._id, relatedModel: 'Tender',
          actionUrl: `/tenders/${tender._id}`,
        });
        const io = req.app.get('io');
        if (io) ngoUsers.forEach(u => io.to(u._id.toString()).emit('notification', {
          title: '🏆 Tender Awarded!',
          message: `Your NGO was awarded "${tender.title}"`,
          type: 'success',
        }));
      }
    }

    // If rejected — notify NGO
    if (req.body.status === 'rejected' && prevStatus !== 'rejected') {
      const tender = app.tender;
      const ngoUsers = await User.find({ ngo: app.applicantNGO, role: { $in: ['ngo_admin', 'ngo_staff'] }, isActive: true }).select('_id');
      if (ngoUsers.length > 0) {
        await notifyMany(ngoUsers.map(u => u._id), {
          title: 'Application Update',
          message: `Your application for "${tender.title}" was not selected. ${app.feedback ? 'Feedback: ' + app.feedback : ''}`,
          type: 'warning', relatedEntity: tender._id, relatedModel: 'Tender',
          actionUrl: `/tenders`,
        });
      }
    }

    res.json({ success: true, data: app });
  } catch (err) { next(err); }
};
