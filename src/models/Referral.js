const mongoose = require('mongoose');

const referralSchema = new mongoose.Schema(
  {
    fromNGO: { type: mongoose.Schema.Types.ObjectId, ref: 'NGO', required: true },
    toNGO: { type: mongoose.Schema.Types.ObjectId, ref: 'NGO', required: true },
    caseTitle: { type: String, required: true },
    caseCategory: {
      type: String,
      enum: ['medical', 'legal', 'shelter', 'rehabilitation', 'counselling', 'financial', 'other'],
      default: 'other',
    },
    encryptedDetails: { type: String, required: true },
    encryptedContact: { type: String, default: '' },
    urgency: {
      type: String,
      enum: ['low', 'medium', 'high', 'critical'],
      default: 'medium',
    },
    status: {
      type: String,
      enum: ['pending', 'accepted', 'declined', 'closed'],
      default: 'pending',
    },
    notes: { type: String, default: '' },
    initiatedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    respondedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    respondedAt: { type: Date },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Referral', referralSchema);
