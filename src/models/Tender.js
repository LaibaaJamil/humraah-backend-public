const mongoose = require('mongoose');

const tenderSchema = new mongoose.Schema(
  {
    title: { type: String, required: true, trim: true },
    description: { type: String, required: true },
    sector: { type: String, default: 'general' },
    budgetAmount: { type: Number, required: true },
    currency: { type: String, default: 'PKR' },
    deadline: { type: Date, required: true },
    eligibility: { type: String, default: '' },
    location: { type: String, default: 'Pakistan' },
    allowCoalitions: { type: Boolean, default: true },
    maxCoalitionPartners: { type: Number, default: 5 },
    status: {
      type: String,
      enum: ['open', 'closed', 'awarded', 'cancelled'],
      default: 'open',
    },
    postedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    donorOrganization: { type: String, default: '' },
    awardedTo: [{ type: mongoose.Schema.Types.ObjectId, ref: 'NGO' }],
    awardedAt: { type: Date },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Tender', tenderSchema);
