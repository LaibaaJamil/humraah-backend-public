const mongoose = require('mongoose');

const applicationSchema = new mongoose.Schema(
  {
    tender: { type: mongoose.Schema.Types.ObjectId, ref: 'Tender', required: true },
    applicantNGO: { type: mongoose.Schema.Types.ObjectId, ref: 'NGO', required: true },
    coalitionPartners: [{ type: mongoose.Schema.Types.ObjectId, ref: 'NGO' }],
    proposalSummary: { type: String, required: true },
    proposalFile: { type: String, default: '' },
    requestedAmount: { type: Number, required: true },
    timelineMonths: { type: Number, default: 12 },
    status: {
      type: String,
      enum: ['submitted', 'shortlisted', 'rejected', 'awarded'],
      default: 'submitted',
    },
    feedback: { type: String, default: '' },
    submittedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Application', applicationSchema);
