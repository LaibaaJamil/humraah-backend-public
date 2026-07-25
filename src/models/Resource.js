const mongoose = require('mongoose');

const resourceSchema = new mongoose.Schema(
  {
    title: { type: String, required: true, trim: true },
    description: { type: String, default: '' },
    category: {
      type: String,
      enum: ['poster', 'video', 'research', 'manual', 'infographic', 'other'],
      default: 'other',
    },
    sector: { type: String, default: 'general' },
    language: {
      type: String,
      enum: ['English', 'Urdu', 'Both'],
      default: 'English',
    },
    visibility: {
  type: String,
  enum: ['public', 'private'],
  default: 'public'
},
    fileUrl: { type: String, required: true },
    fileType: { type: String, default: '' },
    fileSize: { type: Number, default: 0 },
    thumbnailUrl: { type: String, default: '' },
    tags: [{ type: String }],
    downloadCount: { type: Number, default: 0 },
    uploadedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    ngo: { type: mongoose.Schema.Types.ObjectId, ref: 'NGO' },
    isApproved: { type: Boolean, default: true },
  },
  { timestamps: true }
  
);

resourceSchema.index(
  { title: 'text', description: 'text', tags: 'text' },
  { default_language: 'none', language_override: '_textLang' }
);

module.exports = mongoose.model('Resource', resourceSchema);
