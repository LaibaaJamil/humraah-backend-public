const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { v4: uuidv4 } = require('uuid');

const uploadDir = path.join(
  __dirname,
  '..',
  '..',
  process.env.UPLOAD_DIR || 'uploads'
);

// Ensure upload directory exists
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

// Storage config
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadDir);
  },

  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();

    const safeName = file.originalname
      .replace(ext, '')
      .replace(/[^a-zA-Z0-9_-]/g, '_')
      .substring(0, 40);

    cb(
      null,
      `${Date.now()}_${uuidv4().slice(0, 8)}_${safeName}${ext}`
    );
  },
});

// Allowed MIME types
const allowedMimeTypes = new Set([
  // images
  'image/jpeg',
  'image/png',
  'image/jpg',
  'image/webp',
  'image/gif',

  // documents
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',

  // excel
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',

  // videos
  'video/mp4',
  'video/quicktime',
  'video/x-msvideo',
  'video/webm',
]);

// fallback extension check (IMPORTANT FIX)
const allowedExtensions = new Set([
  '.jpg', '.jpeg', '.png', '.webp', '.gif',
  '.pdf',
  '.doc', '.docx',
  '.xls', '.xlsx',
  '.mp4', '.mov', '.avi', '.webm'
]);

const fileFilter = (req, file, cb) => {
  const mime = file.mimetype;
  const ext = path.extname(file.originalname).toLowerCase();

  const mimeValid = allowedMimeTypes.has(mime);
  const extValid = allowedExtensions.has(ext);

  // accept if either passes
  if (mimeValid || extValid) {
    return cb(null, true);
  }

  console.log('Upload rejected:', {
    mime,
    originalname: file.originalname,
    ext
  });

  cb(new Error(`File type not allowed: ${mime || ext}`), false);
};

// Max file size
const maxSize =
  parseInt(process.env.MAX_FILE_SIZE_MB || '25', 10) * 1024 * 1024;

const upload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: maxSize,
  },
});

module.exports = upload;