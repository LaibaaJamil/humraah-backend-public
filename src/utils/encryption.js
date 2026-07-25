const crypto = require('crypto');

const ALGORITHM = 'aes-256-cbc';

const getKey = () => {
  const secret = process.env.AES_SECRET || 'humraah_default_aes_secret_32byte';
  return crypto.createHash('sha256').update(secret).digest();
};

const encrypt = (plainText) => {
  if (!plainText) return '';
  const iv = crypto.randomBytes(16);
  const cipher = crypto.createCipheriv(ALGORITHM, getKey(), iv);
  const encrypted = Buffer.concat([cipher.update(plainText, 'utf8'), cipher.final()]);
  return `${iv.toString('hex')}:${encrypted.toString('hex')}`;
};

const decrypt = (cipherText) => {
  if (!cipherText) return '';
  try {
    const [ivHex, dataHex] = cipherText.split(':');
    const iv = Buffer.from(ivHex, 'hex');
    const data = Buffer.from(dataHex, 'hex');
    const decipher = crypto.createDecipheriv(ALGORITHM, getKey(), iv);
    const decrypted = Buffer.concat([decipher.update(data), decipher.final()]);
    return decrypted.toString('utf8');
  } catch {
    return '';
  }
};

module.exports = { encrypt, decrypt };
