import mongoose from 'mongoose';

const ScheduledNotificationSchema = new mongoose.Schema({
  employerId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User', // Assuming 'User' is your employer model
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
  attempts: { type: Number, default: 0 },
  lastAttemptError: { type: String },
}, { timestamps: true });

const ScheduledNotification = mongoose.model('ScheduledNotification', ScheduledNotificationSchema);

export default ScheduledNotification;