const mongoose = require('mongoose');

const notificationSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    title: { type: String, required: true },
    message: { type: String, required: true },
    type: {
      type: String,
      enum: ['info', 'success', 'warning', 'flag', 'tender', 'referral', 'volunteer', 'system'],
      default: 'info',
    },
    relatedEntity: { type: mongoose.Schema.Types.ObjectId },
    relatedModel: { type: String, default: '' },
    isRead: { type: Boolean, default: false },
    actionUrl: { type: String, default: '' },
  },
  { timestamps: true }
);

notificationSchema.index({ user: 1, isRead: 1, createdAt: -1 });

module.exports = mongoose.model('Notification', notificationSchema);
