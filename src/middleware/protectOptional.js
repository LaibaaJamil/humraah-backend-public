const jwt = require('jsonwebtoken');
const User = require('../models/User');

exports.protectOptional = async (req, res, next) => {
  try {
    const token = req.headers.authorization?.split(' ')[1];

    if (!token) return next();

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = await User.findById(decoded.id);

    next();
  } catch {
    next();
  }
};