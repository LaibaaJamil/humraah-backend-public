const User = require('../models/User');

const updateTrustScore = async ({ userId, action }) => {
  const user = await User.findById(userId);
  if (!user) return;

  switch (action) {
    case 'PIN_VERIFIED':
      user.trustScore += 5;
      user.verifiedReports += 1;
      break;

    case 'PIN_REJECTED':
      user.trustScore -= 10;
      user.rejectedReports += 1;
      break;

    case 'REPORT_VERIFIED':
      user.trustScore += 10;
      user.verifiedReports += 1;
      break;

    case 'REPORT_REJECTED':
      user.trustScore -= 15;
      user.rejectedReports += 1;
      break;
  }

  // Clamp score (important)
  if (user.trustScore > 100) user.trustScore = 100;
  if (user.trustScore < 0) user.trustScore = 0;

  await user.save();
};

module.exports = { updateTrustScore };
const decayTrustScores = async () => {
  const User = require('../models/User');

  await User.updateMany(
    { lastLogin: { $lt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) } },
    { $inc: { trustScore: -2 } }
  );
};

module.exports = { updateTrustScore, decayTrustScores };