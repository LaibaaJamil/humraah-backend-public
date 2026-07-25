const MapPin = require('../models/MapPin');
const { notifyMany, createNotification } = require('../utils/notify');
const User = require('../models/User');
const { updateTrustScore } = require('../utils/trustEngine');

exports.list = async (req, res, next) => {
  try {
    const { type, status, urgency, ngo } = req.query;
    const filter = {};
    if (!req.user) {
      filter.verificationStatus = 'verified';
    } else if (req.user.role === 'public_user' || req.user.role === 'ngo_staff') {
      // Citizens AND NGO staff see all verified pins + only their OWN pending pins
      filter.$or = [
        { verificationStatus: 'verified' },
        { createdBy: req.user._id },
      ];
    } else if (req.user.role === 'ngo_admin') {
      // NGO admin sees every pending pin (so they can verify from the map) + all verified ones
      filter.verificationStatus = { $in: ['verified','pending'] };
    }
    // super_admin sees all - no filter added
    if (type)   filter.type = type;
    if (status) filter.status = status;
    if (urgency) filter.urgencyLevel = urgency;
    if (ngo)    filter.ngo = ngo;
    const pins = await MapPin.find(filter)
      .populate('ngo','name logo')
      .populate('createdBy','name trustScore')
      .sort({ createdAt: -1 });
    res.json({ success: true, data: pins });
  } catch (err) { next(err); }
};

exports.create = async (req, res, next) => {
  try {
    const role = req.user.role;
    const isCitizen = role === 'public_user';
    const isNgoAdmin = role === 'ngo_admin';
    const isNgoStaff = role === 'ngo_staff';
    const isSuperAdmin = role === 'super_admin';
    const type = req.body.type || 'flag';

    const lat = parseFloat(req.body.location?.lat);
    const lng = parseFloat(req.body.location?.lng);
    if (!lat || !lng) return res.status(400).json({ success:false, message:'GPS location required' });
    const images = req.body.images || [];
    if (isCitizen && (!Array.isArray(images) || images.length < 1))
      return res.status(400).json({ success:false, message:'At least 1 image required' });

    // Verification rules:
    // - Citizen flags: always need review (trust/abuse prevention)
    // - NGO Admin (any pin type, including flags): auto-verified, no review needed —
    //   the admin represents and is accountable for the NGO
    // - NGO Staff (any pin type, including flags): always needs NGO Admin/Super Admin
    //   review before it appears on the map — staff actions are reviewed
    // - Super Admin: always auto-verified
    let needsVerification;
    if (isSuperAdmin || isNgoAdmin) {
      needsVerification = false;
    } else if (isCitizen || isNgoStaff) {
      needsVerification = true;
    } else {
      needsVerification = true;
    }

    const data = {
      ...req.body,
      type,
      createdBy: req.user._id,
      ngo: isCitizen ? null : (req.user.ngo?._id || req.user.ngo || null),
      status: needsVerification ? 'pending_verification' : 'active',
      verificationStatus: needsVerification ? 'pending' : 'verified',
    };
    if (!needsVerification) {
      data.verifiedBy = req.user._id;
      data.verifiedAt = new Date();
    }
    const pin = await MapPin.create(data);

    if (needsVerification) {
      const receivers = await User.find({
        role: { $in: ['super_admin','ngo_admin'] }, isActive: true,
      }).select('_id');
      const urgencyLabel = pin.urgencyLevel === 'critical' ? '🚨 CRITICAL' :
                           pin.urgencyLevel === 'high'     ? '⚠️ HIGH'     :
                           pin.urgencyLevel === 'medium'   ? '🟡 MEDIUM'   : 'LOW';
      const reportLabel = isCitizen ? 'New Citizen Report' : 'New Pin Needs Review';
      await notifyMany(receivers.map(u => u._id), {
        title: `${reportLabel} — ${urgencyLabel}`,
        message: `"${pin.title}" in ${pin.city||'unknown'} — needs verification`,
        type: 'flag',
        relatedEntity: pin._id,
        relatedModel: 'MapPin',
        actionUrl: '/admin/pending',
      });
      const io = req.app.get('io');
      if (io) receivers.forEach(u => io.to(u._id.toString()).emit('notification', {
        title: reportLabel,
        message: `"${pin.title}" needs verification`,
        type: 'flag',
      }));
      await createNotification({
        user: req.user._id,
        title: 'Report Submitted ✅',
        message: 'Your report is under review. You\'ll be notified when verified.',
        type: 'info', actionUrl: '/map',
      });
    }
    res.status(201).json({ success:true, data:pin });
  } catch (err) { next(err); }
};

exports.respond = async (req, res, next) => {
  try {
    const allowed = ['ngo_admin','ngo_staff','super_admin'];
    if (!allowed.includes(req.user.role))
      return res.status(403).json({ success:false, message:'Only NGO staff or admin can respond' });
    const pin = await MapPin.findById(req.params.id);
    if (!pin) return res.status(404).json({ success:false, message:'Pin not found' });
    // Super admin can respond without ngo; NGO users need ngo
    const ngoId = req.user.ngo?._id || req.user.ngo;
    if (req.user.role !== 'super_admin' && !ngoId)
      return res.status(400).json({ success:false, message:'Your account has no NGO linked. Contact admin.' });
    if (ngoId && !pin.respondedBy?.some(id => id.toString() === ngoId.toString())) {
      pin.respondedBy = pin.respondedBy || [];
      pin.respondedBy.push(ngoId);
    }
    if (pin.status === 'active' || pin.status === 'pending_verification') pin.status = 'in_progress';
    await pin.save();
    if (pin.createdBy) {
      await createNotification({
        user: pin.createdBy,
        title: '🤝 NGO is Responding!',
        message: `An NGO has started working on "${pin.title}"`,
        type: 'success', actionUrl: '/map',
      });
    }
    res.json({ success:true, data:pin });
  } catch (err) { next(err); }
};

exports.update = async (req, res, next) => {
  try {
    const pin = await MapPin.findById(req.params.id);
    if (!pin) return res.status(404).json({ success:false, message:'Pin not found' });
    const isOwner = pin.createdBy?.toString() === req.user._id.toString();
    const isSuperAdmin = req.user.role === 'super_admin';

    if (req.body.status === 'resolved') {
      // Only the NGO that is actively responding to this flag (or super admin) can resolve it.
      // The citizen/NGO that raised the flag cannot resolve their own flag.
      const ngoId = (req.user.ngo?._id || req.user.ngo)?.toString();
      const isResponder = pin.respondedBy?.some(id => id.toString() === ngoId);
      if (!isSuperAdmin && !isResponder) {
        return res.status(403).json({ success:false, message:'Only the responding NGO can mark this resolved' });
      }
      if (pin.status !== 'in_progress' && !isSuperAdmin) {
        return res.status(400).json({ success:false, message:'Flag must be in progress before it can be resolved' });
      }
    } else if (!isOwner && !isSuperAdmin) {
      return res.status(403).json({ success:false, message:'Not authorized' });
    }

    ['title','description'].forEach(f => { if (req.body[f] !== undefined) pin[f] = req.body[f]; });
    if (req.body.status) pin.status = req.body.status;
    if (req.body.status === 'resolved' && !pin.resolvedAt) pin.resolvedAt = new Date();
    await pin.save();

    if (req.body.status === 'resolved' && pin.createdBy) {
      await createNotification({
        user: pin.createdBy,
        title: '🎉 Issue Resolved!',
        message: `"${pin.title}" has been marked as resolved.`,
        type: 'success', actionUrl: '/map',
      });
      const io = req.app.get('io');
      if (io) io.to(pin.createdBy.toString()).emit('notification', {
        title: '🎉 Issue Resolved!',
        message: `"${pin.title}" has been marked as resolved.`,
        type: 'success',
      });
    }
    res.json({ success:true, data:pin });
  } catch (err) { next(err); }
};

exports.remove = async (req, res, next) => {
  try {
    const pin = await MapPin.findById(req.params.id);
    if (!pin) return res.status(404).json({ success:false, message:'Pin not found' });
    if (req.user.role !== 'super_admin' && pin.createdBy?.toString() !== req.user._id.toString())
      return res.status(403).json({ success:false, message:'Not authorized' });
    await pin.deleteOne();
    res.json({ success:true, message:'Pin removed' });
  } catch (err) { next(err); }
};

exports.heatmap = async (req, res, next) => {
  try {
    const data = await MapPin.aggregate([
      { $match: { type:'flag' } },
      { $group: { _id:'$city', count:{$sum:1}, critical:{$sum:{$cond:[{$eq:['$urgencyLevel','critical']},1,0]}} } },
      { $sort: { count:-1 } },
    ]);
    res.json({ success:true, data });
  } catch (err) { next(err); }
};

exports.pendingPins = async (req, res, next) => {
  try {
    const filter = { verificationStatus: 'pending' };
    // NGO staff are view-only and should only ever see their own pending
    // submissions here too — matching the same rule used on the map.
    // NGO admin and super admin need to see everyone's pending pins to review them.
    if (req.user.role === 'ngo_staff') {
      filter.createdBy = req.user._id;
    }
    const pins = await MapPin.find(filter)
      .populate('createdBy','name email trustScore phone')
      .sort({ createdAt:-1 });
    res.json({ success:true, data:pins });
  } catch (err) { next(err); }
};

exports.verifyPin = async (req, res, next) => {
  try {
    if (!['super_admin','ngo_admin'].includes(req.user.role))
      return res.status(403).json({ success:false, message:'Not authorized' });
    const pin = await MapPin.findById(req.params.id);
    if (!pin) return res.status(404).json({ success:false, message:'Pin not found' });
    pin.verificationStatus = 'verified';
    pin.status = 'active';
    pin.verifiedBy = req.user._id;
    pin.verifiedAt = new Date();
    await pin.save();
    if (pin.createdBy) {
      await updateTrustScore({ userId: pin.createdBy, action:'PIN_VERIFIED' });
      await createNotification({
        user: pin.createdBy,
        title: '✅ Report Verified!',
        message: `Your report "${pin.title}" is now visible on the map.`,
        type:'success', actionUrl:'/map',
      });
      const io = req.app.get('io');
      if (io) io.to(pin.createdBy.toString()).emit('notification', {
        title: '✅ Report Verified!',
        message: `Your report "${pin.title}" is now visible on the map.`,
        type: 'success',
      });
    }
    res.json({ success:true, data:pin });
  } catch (err) { next(err); }
};

exports.rejectPin = async (req, res, next) => {
  try {
    if (!['super_admin','ngo_admin'].includes(req.user.role))
      return res.status(403).json({ success:false, message:'Not authorized' });
    const pin = await MapPin.findById(req.params.id);
    if (!pin) return res.status(404).json({ success:false, message:'Pin not found' });
    pin.verificationStatus = 'rejected';
    pin.status = 'rejected';
    pin.verifiedBy = req.user._id;
    pin.verifiedAt = new Date();
    await pin.save();
    if (pin.createdBy) {
      await updateTrustScore({ userId: pin.createdBy, action:'PIN_REJECTED' });
      await createNotification({
        user: pin.createdBy,
        title: '❌ Report Rejected',
        message: `"${pin.title}" was rejected. ${req.body.reason || 'Please submit accurate reports.'}`,
        type:'warning', actionUrl:'/report-issue',
      });
      const io = req.app.get('io');
      if (io) io.to(pin.createdBy.toString()).emit('notification', {
        title: '❌ Report Rejected',
        message: `"${pin.title}" was rejected.`,
        type: 'warning',
      });
    }
    res.json({ success:true, data:pin });
  } catch (err) { next(err); }
};
