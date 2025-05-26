import mongoose from 'mongoose';

const ScheduledNotificationSchema = new mongoose.Schema({
  employerId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User', 
    required: true,
  },
  recipientEmail: {
    type: String,
    required: true,
    trim: true,
  },
  subject: {
    type: String,
    required: true,
  },
  messageBody: { // Storing the plain text body
    type: String,
    required: true,
  },
  scheduledTimeUTC: { // When the notification should be sent, in UTC
    type: Date,
    required: true,
    index: true,
  },
  status: {
    type: String,
    enum: ['pending', 'sent', 'failed', 'processing'],
    default: 'pending',
    index: true,
  },
  notificationType: { // To categorize notifications
    type: String,
    enum: ['daily_summary', 'action_alert', 'other'], // Add other types as needed
    default: 'action_alert', // Or a more appropriate default
  },
  referenceDayOfWeek: { // For daily_summary, which day's global setting it refers to
    type: String,
    enum: ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday', null],
    default: null, // Null if not applicable (e.g., for action_alert)
  },
  attempts: { type: Number, default: 0 },
  lastAttemptError: { type: String },
}, { timestamps: true });

const ScheduledNotification = mongoose.model('ScheduledNotification', ScheduledNotificationSchema);

export default ScheduledNotification;