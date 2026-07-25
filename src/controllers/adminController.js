const User = require('../models/User');
const NGO = require('../models/NGO');
const Resource = require('../models/Resource');
const MapPin = require('../models/MapPin');
const Tender = require('../models/Tender');
const Application = require('../models/Application');
const Report = require('../models/Report');
const { createNotification } = require('../utils/notify');

exports.dashboard = async (req, res, next) => {
  try {
    const [
      totalUsers, totalNGOs, verifiedNGOs, pendingNGOs,
      totalResources, totalFlags, activeFlags,
      totalTenders, openTenders, totalApplications, totalReports,
    ] = await Promise.all([
      User.countDocuments(),
      NGO.countDocuments(),
      NGO.countDocuments({ verificationStatus: 'verified' }),
      NGO.countDocuments({ verificationStatus: 'pending' }),
      Resource.countDocuments(),
      MapPin.countDocuments({ type: 'flag' }),
      MapPin.countDocuments({ type: 'flag', status: 'active' }),
      Tender.countDocuments(),
      Tender.countDocuments({ status: 'open' }),
      Application.countDocuments(),
      Report.countDocuments(),
    ]);

    const [ngoBySector, flagsByCategory, ngosByProvince] = await Promise.all([
      NGO.aggregate([
        { $unwind: '$sectors' },
        { $group: { _id: '$sectors', count: { $sum: 1 } } },
        { $sort: { count: -1 } }, { $limit: 10 },
      ]),
      MapPin.aggregate([
        { $match: { type: 'flag' } },
        { $group: { _id: '$flagCategory', count: { $sum: 1 } } },
      ]),
      NGO.aggregate([
        { $match: { verificationStatus: 'verified' } },
        { $group: { _id: '$province', count: { $sum: 1 } } },
        { $sort: { count: -1 } },
      ]),
    ]);

    res.json({
      success: true,
      data: {
        counts: {
          totalUsers, totalNGOs, verifiedNGOs, pendingNGOs,
          totalResources, totalFlags, activeFlags,
          totalTenders, openTenders, totalApplications, totalReports,
        },
        ngoBySector, flagsByCategory, ngosByProvince,
      },
    });
  } catch (err) { next(err); }
};

exports.listUsers = async (req, res, next) => {
  try {
    const { role, search } = req.query;
    const filter = {};
    if (role) filter.role = role;
    if (search) filter.$or = [
      { name: new RegExp(search, 'i') },
      { email: new RegExp(search, 'i') },
    ];
    const users = await User.find(filter).populate('ngo', 'name').sort({ createdAt: -1 });
    res.json({ success: true, data: users });
  } catch (err) { next(err); }
};

exports.toggleUserActive = async (req, res, next) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) return res.status(404).json({ success: false, message: 'User not found' });
    user.isActive = !user.isActive;
    await user.save();
    res.json({ success: true, data: user });
  } catch (err) { next(err); }
};

exports.changeUserRole = async (req, res, next) => {
  try {
    const { role } = req.body;
    const allowed = ['public_user', 'donor', 'ngo_staff', 'ngo_admin', 'super_admin'];
    if (!allowed.includes(role)) return res.status(400).json({ success: false, message: 'Invalid role' });
    const user = await User.findById(req.params.id);
    if (!user) return res.status(404).json({ success: false, message: 'User not found' });
    user.role = role;
    await user.save();
    res.json({ success: true, data: user });
  } catch (err) { next(err); }
};

exports.markAsDonor = async (req, res, next) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) return res.status(404).json({ success: false, message: 'User not found' });
    user.role = 'donor';
    await user.save();

    await createNotification({
      user: user._id,
      title: 'Account upgraded to Donor',
      message: 'Your account has been marked as a Donor. You now have access to donor features.',
      type: 'success',
    });
    const io = req.app.get('io');
    if (io) io.to(user._id.toString()).emit('notification', {
      title: 'Account upgraded to Donor',
      message: 'Your account has been marked as a Donor.',
      type: 'success',
    });

    res.json({ success: true, data: user });
  } catch (err) { next(err); }
};

exports.listDonors = async (req, res, next) => {
  try {
    const donors = await User.find({ role: 'donor' }).sort({ createdAt: -1 });
    res.json({ success: true, data: donors });
  } catch (err) { next(err); }
};

exports.pendingVerifications = async (req, res, next) => {
  try {
    const ngos = await NGO.find({ verificationStatus: 'pending' })
      .populate('owner', 'name email phone')
      .sort({ createdAt: -1 });
    res.json({ success: true, data: ngos });
  } catch (err) { next(err); }
};

exports.approveResource = async (req, res, next) => {
  try {
    const resource = await Resource.findById(req.params.id);
    if (!resource) return res.status(404).json({ success: false, message: 'Not found' });
    resource.isApproved = true;
    await resource.save();
    res.json({ success: true });
  } catch (err) { next(err); }
};

exports.toggleLargeOrg = async (req, res, next) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) return res.status(404).json({ success: false, message: 'User not found' });
    if (user.role !== 'donor') return res.status(400).json({ success: false, message: 'Only donor accounts' });
    user.isLargeOrg = req.body.isLargeOrg === true;
    await user.save();
    res.json({ success: true, data: user });
  } catch (err) { next(err); }
};

exports.assignStaffToNgo = async (req, res, next) => {
  try {
    const { ngoId } = req.body;
    const user = await User.findById(req.params.id);
    if (!user) return res.status(404).json({ success: false, message: 'User not found' });
    if (!['ngo_staff', 'ngo_admin'].includes(user.role)) {
      return res.status(400).json({ success: false, message: 'User must be ngo_admin or ngo_staff' });
    }
    const ngo = await NGO.findById(ngoId);
    if (!ngo) return res.status(404).json({ success: false, message: 'NGO not found' });
    user.ngo = ngoId;
    await user.save();

    await createNotification({
      user: user._id,
      title: 'NGO Assignment',
      message: `You have been assigned to ${ngo.name}`,
      type: 'success',
    });
    const io = req.app.get('io');
    if (io) io.to(user._id.toString()).emit('notification', {
      title: 'NGO Assignment',
      message: `You have been assigned to ${ngo.name}`,
      type: 'success',
    });
    res.json({ success: true, data: user });
  } catch (err) { next(err); }
};
