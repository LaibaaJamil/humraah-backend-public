const mongoose = require('mongoose');

const reportSchema = new mongoose.Schema(
  {
    ngo: { type: mongoose.Schema.Types.ObjectId, ref: 'NGO', required: true },
    submittedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    period: {
      month: { type: Number, required: true, min: 1, max: 12 },
      year: { type: Number, required: true },
    },
    sector: { type: String, default: 'general' },
    metrics: {
      beneficiariesReached: { type: Number, default: 0 },
      eventsConducted: { type: Number, default: 0 },
      resourcesDistributed: { type: Number, default: 0 },
      volunteersEngaged: { type: Number, default: 0 },
      fundsUtilized: { type: Number, default: 0 },
    },
    breakdown: {
      women: { type: Number, default: 0 },
      men: { type: Number, default: 0 },
      children: { type: Number, default: 0 },
    },
    locations: [{ type: String }],
    summary: { type: String, default: '' },
    attachments: [{ type: String }],
  },
  { timestamps: true }
);

reportSchema.index({ ngo: 1, 'period.year': 1, 'period.month': 1 }, { unique: true });

module.exports = mongoose.model('Report', reportSchema);
