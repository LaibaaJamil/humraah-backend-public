const otpStore = new Map();

const generateOTP = () => {
  return Math.floor(100000 + Math.random() * 900000).toString();
};

const saveOTP = (email, otp) => {
  otpStore.set(email, {
    otp,
    expires: Date.now() + 5 * 60 * 1000 // 5 min
  });
};

const verifyOTP = (email, otp) => {
  const record = otpStore.get(email);

  if (!record) return false;
  if (Date.now() > record.expires) return false;

  return record.otp === otp;
};

module.exports = { generateOTP, saveOTP, verifyOTP };