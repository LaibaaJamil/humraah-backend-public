const path = require('path');
const fs = require('fs');
const Resource = require('../models/Resource');

/**
 * LIST RESOURCES
 */
exports.list = async (req, res, next) => {
  try {
    const { category, language, sector, search, page = 1, limit = 24 } = req.query;

    const filter = { isApproved: true };

    // PUBLIC USER
    if (!req.user) {
      filter.visibility = 'public';
    }

    // NGO USERS
    else if (req.user.role === 'ngo_admin' || req.user.role === 'ngo_staff') {
      filter.$or = [
        { visibility: 'public' },
        { uploadedBy: req.user._id }
      ];
    }

    // SUPER ADMIN → no restriction
    else if (req.user.role === 'super_admin') {
      // no filter change
    }

    // fallback safety
    else {
      filter.visibility = 'public';
    }

    if (category) filter.category = category;
    if (language) filter.language = language;
    if (sector) filter.sector = sector;
    if (search) filter.$text = { $search: search };

    const skip = (Number(page) - 1) * Number(limit);

    const [items, total] = await Promise.all([
      Resource.find(filter)
        .populate('uploadedBy', 'name')
        .populate('ngo', 'name logo')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(Number(limit)),
      Resource.countDocuments(filter),
    ]);

    res.json({
      success: true,
      data: items,
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

/**
 * GET SINGLE RESOURCE
 */
exports.getById = async (req, res, next) => {
  try {
    const item = await Resource.findById(req.params.id)
      .populate('uploadedBy', 'name email')
      .populate('ngo', 'name logo');

    if (!item) {
      return res.status(404).json({
        success: false,
        message: 'Resource not found',
      });
    }

    // PRIVATE CHECK
    if (item.visibility === 'private') {
      const isOwner =
        req.user &&
        item.uploadedBy.toString() === req.user._id.toString();

      const isSuperAdmin =
        req.user && req.user.role === 'super_admin';

      if (!isOwner && !isSuperAdmin) {
        return res.status(403).json({
          success: false,
          message: 'Not allowed to access this private resource',
        });
      }
    }

    res.json({ success: true, data: item });

  } catch (err) {
    next(err);
  }
};

/**
 * UPLOAD (ONLY NGO ROLES)
 */
exports.upload = async (req, res, next) => {
  try {
    const allowedRoles = ['ngo_admin', 'ngo_staff'];

    if (!req.user || !allowedRoles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: 'Only NGO staff/admin can upload resources',
      });
    }

    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: 'No file uploaded',
      });
    }

    const data = {
      title: req.body.title,
      description: req.body.description || '',
      category: req.body.category || 'other',
      sector: req.body.sector || 'general',
      language: req.body.language || 'English',
      tags: req.body.tags
        ? req.body.tags.split(',').map(t => t.trim())
        : [],
      fileUrl: `/uploads/${req.file.filename}`,
      fileType: req.file.mimetype,
      fileSize: req.file.size,
      uploadedBy: req.user._id,
      ngo: req.user.ngo || undefined,
      visibility: req.body.visibility === 'public' ? 'public' : 'private',
      isApproved: true,
    };

    const item = await Resource.create(data);

    res.status(201).json({ success: true, data: item });

  } catch (err) {
    next(err);
  }
};

/**
 * DOWNLOAD
 */
exports.download = async (req, res, next) => {
  try {
    const item = await Resource.findById(req.params.id);

    if (!item) {
      return res.status(404).json({
        success: false,
        message: 'Resource not found',
      });
    }

    item.downloadCount += 1;
    await item.save();

    res.json({
      success: true,
      data: {
        fileUrl: item.fileUrl,
        downloadCount: item.downloadCount,
      },
    });

  } catch (err) {
    next(err);
  }
};

/**
 * DELETE
 */
exports.remove = async (req, res, next) => {
  try {
    const item = await Resource.findById(req.params.id);

    if (!item) {
      return res.status(404).json({
        success: false,
        message: 'Resource not found',
      });
    }

    const isOwner =
      item.uploadedBy.toString() === req.user._id.toString();

    const isSuperAdmin = req.user.role === 'super_admin';

    if (!isOwner && !isSuperAdmin) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized',
      });
    }

    if (item.fileUrl) {
      const filePath = path.join(__dirname, '..', '..', item.fileUrl.replace(/^\//, ''));
      if (fs.existsSync(filePath)) {
        try { fs.unlinkSync(filePath); } catch {}
      }
    }

    await item.deleteOne();

    res.json({ success: true, message: 'Resource deleted' });

  } catch (err) {
    next(err);
  }
};

/**
 * STATS
 */
exports.stats = async (req, res, next) => {
  try {
    const [total, byCategory, byLanguage, mostDownloaded] = await Promise.all([
      Resource.countDocuments(),
      Resource.aggregate([{ $group: { _id: '$category', count: { $sum: 1 } } }]),
      Resource.aggregate([{ $group: { _id: '$language', count: { $sum: 1 } } }]),
      Resource.find().sort({ downloadCount: -1 }).limit(5).select('title downloadCount category'),
    ]);

    res.json({
      success: true,
      data: { total, byCategory, byLanguage, mostDownloaded },
    });

  } catch (err) {
    next(err);
  }
};