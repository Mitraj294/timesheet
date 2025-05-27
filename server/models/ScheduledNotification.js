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
  messageBody: {
    type: String,
    required: true,
  },
  scheduledTimeUTC: {
    type: Date,
    required: true,
    index: true,
  },
  status: {
    type: String,
    enum: ['pending', 'sent', 'failed', 'processing', 'cancelled_by_settings'],
    default: 'pending',
    index: true,
  },
  notificationType: {
    type: String,
    enum: ['daily_summary', 'action_alert', 'other'],
    default: 'action_alert',
  },
  referenceDayOfWeek: {
    type: String,
    enum: ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday', null],
    default: null,
  },
  attempts: { type: Number, default: 0 },
  lastAttemptError: { type: String },
}, { timestamps: true });

const ScheduledNotification = mongoose.model('ScheduledNotification', ScheduledNotificationSchema);

export default ScheduledNotification;