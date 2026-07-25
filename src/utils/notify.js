const Notification = require('../models/Notification');

const createNotification = async ({ user, title, message, type = 'info', relatedEntity, relatedModel, actionUrl }) => {
  try {
    return await Notification.create({
      user,
      title,
      message,
      type,
      relatedEntity,
      relatedModel,
      actionUrl,
    });
  } catch (err) {
    console.error('Notification creation failed:', err.message);
    return null;
  }
};

const notifyMany = async (userIds, payload) => {
  const docs = userIds.map((id) => ({ ...payload, user: id }));
  try {
    return await Notification.insertMany(docs);
  } catch (err) {
    console.error('Bulk notification failed:', err.message);
    return [];
  }
};

module.exports = { createNotification, notifyMany };
