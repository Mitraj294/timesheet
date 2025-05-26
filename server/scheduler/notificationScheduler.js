import cron from 'node-cron';
import ScheduledNotification from '../models/ScheduledNotification.js';
import sendEmailUtil from '../utils/sendEmail.js';
import moment from 'moment-timezone';

const NOTIFICATION_BATCH_LIMIT = 1000; 

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

    // Logs will only start if notifications are found
    console.log(`[SchedulerV2] Starting notification processing job at ${moment().toISOString()}`);
    console.log(`[SchedulerV2] Found ${notificationsToSend.length} pending notifications. Starting batch processing.`);

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
        console.error(`[SchedulerV2] Failed to process email for notification ID ${notification._id}. Error: ${error.message}`);
        notification.status = 'failed';
        notification.lastAttemptError = error.message;
        failureCount++;
      } finally {
        notification.attempts = (notification.attempts || 0) + 1;
        try {
          await notification.save();
        } catch (saveError) {
          console.error(`[SchedulerV2] CRITICAL: Failed to save notification status for ID ${notification._id} after processing. Error: ${saveError.message}`);
        }
      }
      return notification;
    });

    await Promise.all(emailProcessingPromises);

    console.log(`[SchedulerV2] Batch processing complete. Total processed: ${notificationsToSend.length}. Sent successfully: ${successCount}. Failed: ${failureCount}.`);

  } catch (error) {
    console.error('[SchedulerV2] General error during processing scheduled notifications:', error);
  }
};

export const startNotificationScheduler = () => {
  const cronSchedule = process.env.NOTIFICATION_SCHEDULER_CRON || '* * * * *';
  
  if (cron.validate(cronSchedule)) {
    cron.schedule(cronSchedule, () => {
      processScheduledNotifications().catch(err => {
        console.error('[SchedulerV2] Unhandled error in processScheduledNotifications cron job:', err);
      });
    });
    console.log(`[SchedulerV2] Notification scheduler started. Will run with pattern "${cronSchedule}".`);
  } else {
    console.error(`[SchedulerV2] Invalid CRON pattern for notification scheduler: "${cronSchedule}". Job not started.`);
  }
};
