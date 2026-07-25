const mongoose = require('mongoose');

const mapPinSchema = new mongoose.Schema(
  {
    type: {
      type: String,
      enum: ['office', 'project', 'flag'],
      default: 'project',
    },
    title: { type: String, required: true },
    description: { type: String, default: '' },
    location: {
      lat: { type: Number, required: true },
      lng: { type: Number, required: true },
    },
    address: { type: String, default: '' },
    city: { type: String, default: '' },
    images: [{ type: String }],
    videos: [{ type: String }],
    flagCategory: {
      type: String,
      enum: ['medical', 'legal', 'food', 'shelter', 'education', 'other', null],
      default: null,
    },
    urgencyLevel: {
      type: String,
      enum: ['low', 'medium', 'high', 'critical'],
      default: 'medium',
    },
    status: {
  type: String,
  enum: [
    'pending_verification',
    'active',
    'in_progress',
    'resolved',
    'closed',
    'rejected'
  ],
  default: 'pending_verification',
},
    ngo: { type: mongoose.Schema.Types.ObjectId, ref: 'NGO' },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    respondedBy: [{ type: mongoose.Schema.Types.ObjectId, ref: 'NGO' }],
   verificationStatus: {
  type: String,
  enum: ['pending', 'verified', 'rejected'],
  default: 'pending',
},

verifiedBy: {
  type: mongoose.Schema.Types.ObjectId,
  ref: 'User',
},

verifiedAt: {
  type: Date,
},
    resolvedAt: { type: Date },
  },
  { timestamps: true }
);

mapPinSchema.index({ 'location.lat': 1, 'location.lng': 1 });

module.exports = mongoose.model('MapPin', mapPinSchema);
