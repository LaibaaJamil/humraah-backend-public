const jwt = require('jsonwebtoken');
const User = require('../models/User');
const NGO = require('../models/NGO');

const signToken = (id) =>
  jwt.sign({ id }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN || '7d',
  });

exports.register = async (req, res, next) => {
  try {
    const { name, email, password, phone, role, ngoData } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({ success: false, message: 'Name, email and password are required' });
    }

    const exists = await User.findOne({ email: email.toLowerCase() });
    if (exists) {
      return res.status(400).json({ success: false, message: 'Email already registered' });
    }

    const allowedRoles = ['ngo_admin', 'ngo_staff', 'donor', 'public_user'];
    const userRole = allowedRoles.includes(role) ? role : 'public_user';

    const user = await User.create({
      name,
      email: email.toLowerCase(),
      password,
      phone,
      role: userRole,
    });

    if (userRole === 'ngo_admin' && ngoData && ngoData.name && ngoData.registrationNumber) {
      const ngo = await NGO.create({
        ...ngoData,
        email: ngoData.email || email,
        owner: user._id,
        verificationStatus: 'pending',
      });
      user.ngo = ngo._id;
      await user.save();
    }

    const populatedUser = await User.findById(user._id).populate('ngo');
    const token = signToken(user._id);

    res.status(201).json({
      success: true,
      message: 'Registration successful',
      data: { user: populatedUser, token },
    });
  } catch (err) {
    next(err);
  }
};

exports.login = async (req, res, next) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ success: false, message: 'Email and password required' });
    }

    const user = await User.findOne({ email: email.toLowerCase() }).select('+password').populate('ngo');
    if (!user) {
      return res.status(401).json({ success: false, message: 'Invalid credentials' });
    }
    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      return res.status(401).json({ success: false, message: 'Invalid credentials' });
    }

    user.lastLogin = new Date();
    await user.save();

    const token = signToken(user._id);
    const userObj = user.toJSON();
    res.json({
      success: true,
      message: 'Login successful',
      data: { user: userObj, token },
    });
  } catch (err) {
    next(err);
  }
};

exports.me = async (req, res) => {
  res.json({ success: true, data: { user: req.user } });
};

exports.updateProfile = async (req, res, next) => {
  try {
    const { name, phone, avatar } = req.body;
    const user = await User.findByIdAndUpdate(
      req.user._id,
      { name, phone, avatar },
      { new: true, runValidators: true }
    ).populate('ngo');
    res.json({ success: true, data: { user } });
  } catch (err) {
    next(err);
  }
};

exports.changePassword = async (req, res, next) => {
  try {
    const { oldPassword, newPassword } = req.body;
    if (!oldPassword || !newPassword || newPassword.length < 6) {
      return res.status(400).json({ success: false, message: 'Invalid password input' });
    }
    const user = await User.findById(req.user._id).select('+password');
    const valid = await user.comparePassword(oldPassword);
    if (!valid) {
      return res.status(401).json({ success: false, message: 'Old password incorrect' });
    }
    user.password = newPassword;
    await user.save();
    res.json({ success: true, message: 'Password changed successfully' });
  } catch (err) {
    next(err);
  }

};
const { generateOTP, saveOTP, verifyOTP } = require('../utils/otpService');
exports.sendOTP = async (req, res) => {
  const { email } = req.body;

  const otp = generateOTP();
  saveOTP(email, otp);

  console.log("OTP:", otp); // later email service lagani hai

  res.json({
    success: true,
    message: "OTP sent"
  });
};
exports.verifyOTP = async (req, res) => {
  const { email, otp } = req.body;

  const valid = verifyOTP(email, otp);

  if (!valid) {
    return res.status(400).json({
      success: false,
      message: "Invalid OTP"
    });
  }

  await User.updateOne({ email }, { isVerified: true });

  res.json({
    success: true,
    message: "Account verified"
  });
};
