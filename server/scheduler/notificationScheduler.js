// /home/digilab/timesheet/server/scheduler/notificationScheduler.js
import cron from 'node-cron';
import moment from 'moment-timezone';
import ScheduledNotification from '../models/ScheduledNotification.js';
import sendEmailUtil from '../utils/sendEmail.js'; // Assuming your sendEmail utility is default export

const processScheduledNotifications = async () => {
  // console.log(`[Scheduler] Running processScheduledNotifications job at ${moment().format()}`); // Keep commented for less noise
  const nowUTC = new Date();

  // Find pending notifications that are due
  // The fiveMinutesAgo variable is not strictly necessary for the current query logic ($lte: nowUTC)
  // but can be useful if you implement more complex windowed queries or retry logic.
  // const fiveMinutesAgo = moment(nowUTC).subtract(5, 'minutes').toDate();

  const notificationsToSend = await ScheduledNotification.find({
    status: 'pending',
    scheduledTimeUTC: { $lte: nowUTC },
  }).limit(50); // Process in batches to avoid overwhelming the system

  if (notificationsToSend.length === 0) {
    // No pending notifications, so we don't log anything to keep the console clean.
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
        // html: can be added if your ScheduledNotification stores HTML
      });

      notification.status = 'sent';
      console.log(`[Scheduler] Successfully sent scheduled notification ID: ${notification._id} to ${notification.recipientEmail}`);
    } catch (error) {
      console.error(`[Scheduler] Failed to send scheduled notification ID: ${notification._id}. Error: ${error.message}`);
      notification.status = 'failed';
      notification.lastAttemptError = error.message;
      // Future enhancement: Implement retry logic based on notification.attempts
      // For example, if notification.attempts < MAX_RETRY_ATTEMPTS, don't mark as 'failed' yet,
      // but perhaps set a new, slightly later scheduledTimeUTC.
    } finally {
      // Ensure the notification status is saved regardless of success or failure of sending.
      await notification.save();
    }
  }
};

export const startNotificationScheduler = () => {
  // Run the job every minute. Adjust as needed.
  // For testing, you might run it more frequently. For production, every minute or every 5 minutes is common.
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
