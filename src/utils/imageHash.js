const crypto = require('crypto');

const generateHash = (imageBuffer) => {
  return crypto.createHash('sha256').update(imageBuffer).digest('hex');
};

module.exports = { generateHash };