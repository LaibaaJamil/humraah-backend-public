const Report = require('../models/Report');
const NGO = require('../models/NGO');
const User = require('../models/User');
const { notifyMany } = require('../utils/notify');

exports.submitReport = async (req, res, next) => {
  try {
    const ngoId = req.user.ngo?._id || req.user.ngo;
    if (!ngoId) return res.status(400).json({ success: false, message: 'No NGO associated with your account' });

    const data = { ...req.body, ngo: ngoId, submittedBy: req.user._id };

    const existing = await Report.findOne({
      ngo: ngoId,
      'period.year': data.period?.year,
      'period.month': data.period?.month,
    });

    let report;
    if (existing) {
      Object.assign(existing, data);
      await existing.save();
      report = existing;
    } else {
      report = await Report.create(data);
    }

    // Notify super admins
    const superAdmins = await User.find({ role: 'super_admin', isActive: true }).select('_id');
    if (superAdmins.length > 0) {
      const ngo = await NGO.findById(ngoId).select('name');
      await notifyMany(superAdmins.map((u) => u._id), {
        title: 'Impact Report Submitted',
        message: `${ngo?.name || 'An NGO'} submitted their impact report`,
        type: 'success',
        relatedEntity: report._id,
        relatedModel: 'Report',
        actionUrl: '/reports',
      });
      const io = req.app.get('io');
      if (io) superAdmins.forEach((u) => io.to(u._id.toString()).emit('notification', {
        title: 'Impact Report Submitted',
        message: `${ngo?.name || 'An NGO'} submitted their impact report`,
        type: 'success',
      }));
    }

    res.status(existing ? 200 : 201).json({ success: true, data: report });
  } catch (err) { next(err); }
};

exports.list = async (req, res, next) => {
  try {
    const { ngo, year, month } = req.query;
    const filter = {};
    if (ngo) filter.ngo = ngo;
    if (year) filter['period.year'] = Number(year);
    if (month) filter['period.month'] = Number(month);
    const reports = await Report.find(filter)
      .populate('ngo', 'name logo')
      .populate('submittedBy', 'name')
      .sort({ 'period.year': -1, 'period.month': -1 });
    res.json({ success: true, data: reports });
  } catch (err) { next(err); }
};

exports.myReports = async (req, res, next) => {
  try {
    const ngoId = req.user.ngo?._id || req.user.ngo;
    if (!ngoId) return res.json({ success: true, data: [] });
    const reports = await Report.find({ ngo: ngoId }).sort({ 'period.year': -1, 'period.month': -1 });
    res.json({ success: true, data: reports });
  } catch (err) { next(err); }
};

exports.analytics = async (req, res, next) => {
  try {
    const { ngo, year } = req.query;
    const match = {};
    if (ngo) match.ngo = require('mongoose').Types.ObjectId.isValid(ngo)
      ? new (require('mongoose').Types.ObjectId)(ngo) : undefined;
    if (year) match['period.year'] = Number(year);
    // Remove undefined keys
    Object.keys(match).forEach(k => match[k] === undefined && delete match[k]);

    const [monthly, totalsArr, sectorBreakdown] = await Promise.all([
      Report.aggregate([
        { $match: match },
        { $group: {
          _id: { year: '$period.year', month: '$period.month' },
          beneficiariesReached: { $sum: '$metrics.beneficiariesReached' },
          eventsConducted: { $sum: '$metrics.eventsConducted' },
          fundsUtilized: { $sum: '$metrics.fundsUtilized' },
        }},
        { $sort: { '_id.year': 1, '_id.month': 1 } },
      ]),
      Report.aggregate([
        { $match: match },
        { $group: {
          _id: null,
          beneficiariesReached: { $sum: '$metrics.beneficiariesReached' },
          eventsConducted: { $sum: '$metrics.eventsConducted' },
          resourcesDistributed: { $sum: '$metrics.resourcesDistributed' },
          volunteersEngaged: { $sum: '$metrics.volunteersEngaged' },
          fundsUtilized: { $sum: '$metrics.fundsUtilized' },
          women: { $sum: '$breakdown.women' },
          men: { $sum: '$breakdown.men' },
          children: { $sum: '$breakdown.children' },
        }},
      ]),
      Report.aggregate([
        { $match: match },
        { $group: {
          _id: '$sector',
          beneficiaries: { $sum: '$metrics.beneficiariesReached' },
          events: { $sum: '$metrics.eventsConducted' },
        }},
      ]),
    ]);

    res.json({
      success: true,
      data: {
        monthly,
        totals: totalsArr[0] || {
          beneficiariesReached: 0, eventsConducted: 0, resourcesDistributed: 0,
          volunteersEngaged: 0, fundsUtilized: 0, women: 0, men: 0, children: 0,
        },
        sectorBreakdown,
      },
    });
  } catch (err) { next(err); }
};

exports.nationalImpact = async (req, res, next) => {
  try {
    const [totalsArr, ngoCount, reportingNGOs] = await Promise.all([
      Report.aggregate([{ $group: {
        _id: null,
        beneficiariesReached: { $sum: '$metrics.beneficiariesReached' },
        eventsConducted: { $sum: '$metrics.eventsConducted' },
        fundsUtilized: { $sum: '$metrics.fundsUtilized' },
        volunteersEngaged: { $sum: '$metrics.volunteersEngaged' },
      }}]),
      NGO.countDocuments({ verificationStatus: 'verified' }),
      Report.distinct('ngo'),
    ]);
    res.json({
      success: true,
      data: {
        verifiedNGOs: ngoCount,
        reportingNGOs: reportingNGOs.length,
        totals: totalsArr[0] || {},
      },
    });
  } catch (err) { next(err); }
};
