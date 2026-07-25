const mongoose = require('mongoose');

const citizenReportSchema = new mongoose.Schema({
  description: { type: String, required: true },

  location: {
    lat: Number,
    lng: Number
  },

  images: [String],
  videos: [String],

  submittedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },

  status: {
    type: String,
    enum: ['pending', 'verified', 'rejected'],
    default: 'pending'
  },

  verificationNotes: String,

  verifiedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },

  verifiedAt: Date

}, { timestamps: true });

module.exports = mongoose.model('CitizenReport', citizenReportSchema);