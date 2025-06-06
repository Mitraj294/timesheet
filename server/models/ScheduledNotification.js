import mongoose from 'mongoose';

// Stores scheduled email notifications for an employer
const ScheduledNotificationSchema = new mongoose.Schema({
  employerId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User', // Who owns this notification
    required: true,
  },
  recipientEmail: {
    type: String,
    required: true,
    trim: true, // Email to send notification to
  },
  subject: {
    type: String,
    required: true, // Email subject
  },
  messageBody: {
    type: String,
    required: true, // Email content
  },
  scheduledTimeUTC: {
    type: Date,
    required: true, // When to send (UTC)
    index: true,
  },
  status: {
    type: String,
    enum: ['pending', 'sent', 'failed', 'processing', 'cancelled_by_settings'],
    default: 'pending',
    index: true, // For quick lookup of pending jobs
  },
  notificationType: {
    type: String,
    enum: ['daily_summary', 'action_alert', 'other'],
    default: 'action_alert', // Why this notification is sent
  },
  referenceDayOfWeek: {
    type: String,
    enum: ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday', null],
    default: null, // For recurring notifications
  },
  attempts: { type: Number, default: 0 }, // How many times tried
  lastAttemptError: { type: String }, // Last error message if failed
}, { timestamps: true }); // Adds createdAt and updatedAt

const ScheduledNotification = mongoose.model('ScheduledNotification', ScheduledNotificationSchema);

export default ScheduledNotification;