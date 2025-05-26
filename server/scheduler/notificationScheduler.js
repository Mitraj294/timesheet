import cron from 'node-cron';
import ScheduledNotification from '../models/ScheduledNotification.js';
import sendEmailUtil from '../utils/sendEmail.js';
import moment from 'moment-timezone';

const NOTIFICATION_BATCH_LIMIT = 100; // Process notifications in batches of 100 for email sending

const processScheduledNotifications = async () => {
  const nowUTC = new Date();

  try {
    const notificationsToSend = await ScheduledNotification.find({
      status: 'pending',
      scheduledTimeUTC: { $lte: nowUTC },
    }).limit(NOTIFICATION_BATCH_LIMIT);
    
    if (notificationsToSend.length === 0) {
      return;
    }

    // Logs for the current batch processing run
    const batchRunTimestamp = moment().toISOString();
    console.log(`[Scheduler] Batch run started at ${batchRunTimestamp}. Configured batch limit: ${NOTIFICATION_BATCH_LIMIT}.`);
    console.log(`[Scheduler] Found ${notificationsToSend.length} notifications for this batch run.`);

    let successCount = 0;
    let failureCount = 0;

    const emailProcessingPromises = notificationsToSend.map(async (notification) => {
      try {
        const htmlBody = notification.messageBody.replace(/\n/g, '<br/>');
        
        await sendEmailUtil({
          to: notification.recipientEmail,
          subject: notification.subject,
          html: htmlBody,
          text: notification.messageBody,
        });

        notification.status = 'sent';
        notification.sentAt = new Date();
        successCount++;
      } catch (error) {
        console.error(`[Scheduler] Failed to process email for notification ID ${notification._id}. Error: ${error.message}`);
        notification.status = 'failed';
        notification.lastAttemptError = error.message;
        failureCount++;
      } finally {
        notification.attempts = (notification.attempts || 0) + 1;
        try {
          await notification.save();
        } catch (saveError) {
          console.error(`[Scheduler] CRITICAL: Failed to save notification status for ID ${notification._id} after processing. Error: ${saveError.message}`);
        }
      }
      return notification;
    });

    await Promise.all(emailProcessingPromises);

    console.log(`[Scheduler] Batch run at ${batchRunTimestamp} completed. Processed in this batch: ${notificationsToSend.length} (Sent: ${successCount}, Failed: ${failureCount}).`);

  } catch (error) {
    console.error('[Scheduler] General error during processing scheduled notifications:', error);
  }
};

export const startNotificationScheduler = () => {
  const cronSchedule = process.env.NOTIFICATION_SCHEDULER_CRON || '* * * * *';
  
  if (cron.validate(cronSchedule)) {
    cron.schedule(cronSchedule, () => {
      processScheduledNotifications().catch(err => {
        console.error('[Scheduler] Unhandled error in processScheduledNotifications cron job:', err);
      });
    });
    console.log(`[Scheduler] Notification scheduler started. Will run with pattern "${cronSchedule}".`);
  } else {
    console.error(`[Scheduler] Invalid CRON pattern for notification scheduler: "${cronSchedule}". Job not started.`);
  }
};
