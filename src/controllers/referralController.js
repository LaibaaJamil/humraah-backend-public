const Referral = require('../models/Referral');
const NGO = require('../models/NGO');
const User = require('../models/User');
const { encrypt, decrypt } = require('../utils/encryption');
const { createNotification } = require('../utils/notify');

exports.create = async (req, res, next) => {
  try {
    if (!req.user.ngo) {
      return res.status(400).json({ success: false, message: 'Only NGO members can refer cases' });
    }
    const fromNGO = req.user.ngo._id || req.user.ngo;
    const { toNGO, caseTitle, caseCategory, details, contact, urgency, notes } = req.body;

    if (!toNGO || !caseTitle || !details) {
      return res.status(400).json({ success: false, message: 'Missing required fields' });
    }

    const target = await NGO.findById(toNGO);
    if (!target) return res.status(404).json({ success: false, message: 'Target NGO not found' });

    const referral = await Referral.create({
      fromNGO,
      toNGO,
      caseTitle,
      caseCategory,
      encryptedDetails: encrypt(details),
      encryptedContact: contact ? encrypt(contact) : '',
      urgency: urgency || 'medium',
      notes: notes || '',
      initiatedBy: req.user._id,
    });

    const targetUser = await User.findOne({ ngo: toNGO, role: 'ngo_admin' });
    if (targetUser) {
      await createNotification({
        user: targetUser._id,
        title: 'New Case Referral',
        message: `Case "${caseTitle}" referred to your organization`,
        type: 'referral',
        relatedEntity: referral._id,
        relatedModel: 'Referral',
        actionUrl: '/referrals',
      });
    }

    res.status(201).json({ success: true, data: referral });
  } catch (err) {
    next(err);
  }
};

exports.incoming = async (req, res, next) => {
  try {
    if (!req.user.ngo) return res.json({ success: true, data: [] });
    const ngoId = req.user.ngo._id || req.user.ngo;
    const items = await Referral.find({ toNGO: ngoId })
      .populate('fromNGO', 'name logo')
      .populate('initiatedBy', 'name')
      .sort({ createdAt: -1 });
    const decoded = items.map((r) => ({
      ...r.toObject(),
      details: decrypt(r.encryptedDetails),
      contact: r.encryptedContact ? decrypt(r.encryptedContact) : '',
    }));
    res.json({ success: true, data: decoded });
  } catch (err) {
    next(err);
  }
};

exports.outgoing = async (req, res, next) => {
  try {
    if (!req.user.ngo) return res.json({ success: true, data: [] });
    const ngoId = req.user.ngo._id || req.user.ngo;
    const items = await Referral.find({ fromNGO: ngoId })
      .populate('toNGO', 'name logo')
      .sort({ createdAt: -1 });
    res.json({ success: true, data: items });
  } catch (err) {
    next(err);
  }
};

exports.respond = async (req, res, next) => {
  try {
    const { status, notes } = req.body;
    if (!['accepted', 'declined', 'closed'].includes(status)) {
      return res.status(400).json({ success: false, message: 'Invalid status' });
    }
    const referral = await Referral.findById(req.params.id);
    if (!referral) return res.status(404).json({ success: false, message: 'Referral not found' });
    if (!req.user.ngo) {
      return res.status(403).json({ success: false, message: 'Not authorized' });
    }
    const ngoId = (req.user.ngo._id || req.user.ngo).toString();
    if (referral.toNGO.toString() !== ngoId) {
      return res.status(403).json({ success: false, message: 'Not the recipient NGO' });
    }
    referral.status = status;
    referral.respondedBy = req.user._id;
    referral.respondedAt = new Date();
    if (notes) referral.notes = notes;
    await referral.save();
    res.json({ success: true, data: referral });
  } catch (err) {
    next(err);
  }
};
