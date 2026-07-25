const sendNotification = (req, userId, payload) => {
  const io = req.app.get('io');

  if (!io) return;

  io.to(userId.toString()).emit('notification', {
    title: payload.title,
    message: payload.message,
    type: payload.type || 'info',
    timestamp: new Date()
  });
};

module.exports = { sendNotification };