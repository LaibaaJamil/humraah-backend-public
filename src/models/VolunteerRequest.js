const mongoose = require('mongoose');

const volunteerRequestSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    ngo: { type: mongoose.Schema.Types.ObjectId, ref: 'NGO', required: true },
    message: { type: String, default: '' },
    skills: [{ type: String }],
    availability: { type: String, default: '' },
    contactPhone: { type: String, default: '' },
    status: {
      type: String,
      enum: ['pending', 'accepted', 'declined'],
      default: 'pending',
    },
    response: { type: String, default: '' },
  },
  { timestamps: true }
);

volunteerRequestSchema.index({ user: 1, ngo: 1 });

module.exports = mongoose.model('VolunteerRequest', volunteerRequestSchema);
