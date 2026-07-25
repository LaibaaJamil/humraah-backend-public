const VolunteerRequest = require('../models/VolunteerRequest');
const NGO = require('../models/NGO');
const User = require('../models/User');
const { notifyMany, createNotification } = require('../utils/notify');

exports.create = async (req, res, next) => {
  try {
    const { ngo, message, skills, availability, contactPhone } = req.body;
    if (!ngo) return res.status(400).json({ success: false, message: 'NGO is required' });
    const target = await NGO.findById(ngo);
    if (!target || target.verificationStatus !== 'verified') {
      return res.status(400).json({ success: false, message: 'Can only volunteer with verified NGOs' });
    }
    const request = await VolunteerRequest.create({
      user: req.user._id,
      ngo,
      message: message || '',
      skills: skills || [],
      availability: availability || '',
      contactPhone: contactPhone || req.user.phone || '',
    });

    const ngoUsers = await User.find({
      ngo,
      role: { $in: ['ngo_admin', 'ngo_staff'] },
      isActive: true,
    }).select('_id');

    if (ngoUsers.length > 0) {
      await notifyMany(ngoUsers.map((u) => u._id), {
        title: 'New Volunteer Request',
        message: `${req.user.name} wants to volunteer with your NGO`,
        type: 'volunteer',
        relatedEntity: request._id,
        relatedModel: 'VolunteerRequest',
        actionUrl: '/volunteers/requests',
      });
      const io = req.app.get('io');
      if (io) ngoUsers.forEach((u) => io.to(u._id.toString()).emit('notification', {
        title: 'New Volunteer Request',
        message: `${req.user.name} wants to volunteer`,
        type: 'volunteer',
      }));
    }

    res.status(201).json({ success: true, data: request });
  } catch (err) { next(err); }
};

exports.mine = async (req, res, next) => {
  try {
    const list = await VolunteerRequest.find({ user: req.user._id })
      .populate('ngo', 'name logo sector city')
      .sort({ createdAt: -1 });
    res.json({ success: true, data: list });
  } catch (err) { next(err); }
};

exports.forNgo = async (req, res, next) => {
  try {
    // Get ngoId from user's ngo field (could be ObjectId or populated object)
    const ngoId = req.user.ngo?._id || req.user.ngo;
    if (!ngoId) return res.json({ success: true, data: [] });
    const list = await VolunteerRequest.find({ ngo: ngoId })
      .populate('user', 'name email phone trustScore')
      .populate('ngo', 'name logo')
      .sort({ createdAt: -1 });
    res.json({ success: true, data: list });
  } catch (err) { next(err); }
};

exports.respond = async (req, res, next) => {
  try {
    const { status, response } = req.body;
    if (!['accepted', 'declined'].includes(status)) {
      return res.status(400).json({ success: false, message: 'Invalid status' });
    }
    const request = await VolunteerRequest.findById(req.params.id);
    if (!request) return res.status(404).json({ success: false, message: 'Request not found' });

    // Get ngoId safely - handle both populated and unpopulated
    const ngoId = (req.user.ngo?._id || req.user.ngo)?.toString();
    if (!ngoId) return res.status(403).json({ success: false, message: 'Your account has no NGO linked. Contact admin.' });
    if (request.ngo.toString() !== ngoId) {
      return res.status(403).json({ success: false, message: 'Not authorized for this request' });
    }

    request.status = status;
    if (response !== undefined) request.response = response;
    await request.save();

    await createNotification({
      user: request.user,
      title: status === 'accepted' ? '🎉 Volunteer request accepted!' : 'Volunteer request update',
      message: response || (status === 'accepted'
        ? 'Your volunteer request has been accepted. Welcome aboard!'
        : 'Your volunteer request was not accepted at this time.'),
      type: status === 'accepted' ? 'success' : 'warning',
      relatedEntity: request._id,
      relatedModel: 'VolunteerRequest',
      actionUrl: '/volunteers/requests',
    });

    const io = req.app.get('io');
    if (io) io.to(request.user.toString()).emit('notification', {
      title: status === 'accepted' ? '🎉 Volunteer accepted!' : 'Volunteer request update',
      message: response || `Your volunteer request was ${status}.`,
      type: status === 'accepted' ? 'success' : 'warning',
    });

    res.json({ success: true, data: request });
  } catch (err) { next(err); }
};
