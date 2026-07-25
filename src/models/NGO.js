const mongoose = require('mongoose');

const ngoSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    registrationNumber: { type: String, required: true, unique: true, trim: true },
    description: { type: String, default: '' },
    sectors: [{ type: String }],
    email: { type: String, required: true, lowercase: true },
    phone: { type: String },
    website: { type: String, default: '' },
    address: { type: String, default: '' },
    city: { type: String, default: '' },
    province: { type: String, default: '' },
    location: {
      lat: { type: Number, default: 0 },
      lng: { type: Number, default: 0 },
    },
    logo: { type: String, default: '' },
    legalCertificate: { type: String, default: '' },
    verificationStatus: {
      type: String,
      enum: ['pending', 'verified', 'rejected'],
      default: 'pending',
    },
    rejectionReason: { type: String, default: '' },
    verifiedAt: { type: Date },
    verifiedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    owner: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    staffCount: { type: Number, default: 0 },
    languagesSupported: [{ type: String, default: ['English', 'Urdu'] }],
  },
  { timestamps: true }
);

ngoSchema.index({ name: 'text', description: 'text', sectors: 'text' });

module.exports = mongoose.model('NGO', ngoSchema);
