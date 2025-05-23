import cron from 'node-cron';
import moment from 'moment-timezone';
import ScheduledNotification from '../models/ScheduledNotification.js';
import sendEmailUtil from '../utils/sendEmail.js';

const NOTIFICATION_BATCH_SIZE = 10;

const processScheduledNotifications = async () => {
  const nowUTC = new Date();

  // Find pending notifications that are due, processing them in batches.
  const notificationsToSend = await ScheduledNotification.find({
    status: 'pending',
    scheduledTimeUTC: { $lte: nowUTC },
  }).limit(NOTIFICATION_BATCH_SIZE);

  if (notificationsToSend.length === 0) {
    return;
  }

  console.log(`[Scheduler] Found ${notificationsToSend.length} pending notifications to process.`);

  for (const notification of notificationsToSend) {
    try {
      // Mark as processing to prevent duplicate sends by other concurrent jobs (if any)
      notification.status = 'processing';
      notification.attempts = (notification.attempts || 0) + 1;
      await notification.save();

      await sendEmailUtil({
        to: notification.recipientEmail,
        subject: notification.subject,
        text: notification.messageBody,
      });

      notification.status = 'sent';
      console.log(`[Scheduler] Successfully sent scheduled notification ID: ${notification._id} to ${notification.recipientEmail}`);
    } catch (error) {
      console.error(`[Scheduler] Failed to send scheduled notification ID: ${notification._id}. Error: ${error.message}`);
      notification.status = 'failed';
      notification.lastAttemptError = error.message;
      // TODO: Implement more sophisticated retry logic based on notification.attempts.
      // For example, if notification.attempts < MAX_RETRY_ATTEMPTS, don't mark as 'failed' yet,
      // but perhaps set a new, slightly later scheduledTimeUTC.
    } finally {
      await notification.save();
    }
  }
};

export const startNotificationScheduler = () => {
  // Default cron schedule runs every minute. Configurable via environment variable.
  const cronSchedule = process.env.NOTIFICATION_SCHEDULER_CRON || '* * * * *';
  
  if (cron.validate(cronSchedule)) {
    cron.schedule(cronSchedule, () => {
      processScheduledNotifications().catch(err => {
        // Catch unhandled errors from the async processScheduledNotifications function
        console.error('[Scheduler] Unhandled error in processScheduledNotifications cron job:', err);
      });
    });
    console.log(`[Scheduler] Notification scheduler started. Will run with pattern "${cronSchedule}".`);
  } else {
    console.error(`[Scheduler] Invalid CRON pattern for notification scheduler: "${cronSchedule}". Job not started.`);
  }
};
