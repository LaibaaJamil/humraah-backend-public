const { decayTrustScores } = require('../utils/trustEngine');

const runDecay = async () => {
  await decayTrustScores();
  console.log("Trust decay executed");
};

module.exports = runDecay;