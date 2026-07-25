const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },
    password: { type: String, required: true, minlength: 6, select: false },
    phone: { type: String, trim: true },
    role: {
      type: String,
      enum: ['super_admin', 'ngo_admin', 'ngo_staff', 'donor', 'public_user'],
      default: 'public_user',
    },
    ngo: { type: mongoose.Schema.Types.ObjectId, ref: 'NGO' },
    isLargeOrg: {
      type: Boolean,
      default: false, // true for UNICEF-level large organizations that can post tenders
    },
trustScore: {
  type: Number,
  default: 50,
},

verifiedReports: {
  type: Number,
  default: 0,
},

rejectedReports: {
  type: Number,
  default: 0,
},
    avatar: { type: String, default: '' },
    isActive: { type: Boolean, default: true },
    isPhoneVerified: {
  type: Boolean,
  default: false,
},

otpCode: {
  type: String,
},

otpExpiry: {
  type: Date,
},
    lastLogin: { type: Date },
  },
  { timestamps: true }

  
);

userSchema.pre('save', async function (next) {
  if (!this.isModified('password')) return next();
  this.password = await bcrypt.hash(this.password, 10);
  next();
});

userSchema.methods.comparePassword = function (candidate) {
  return bcrypt.compare(candidate, this.password);
};

userSchema.methods.toJSON = function () {
  const obj = this.toObject();
  delete obj.password;
  return obj;
};


module.exports = mongoose.model('User', userSchema);
