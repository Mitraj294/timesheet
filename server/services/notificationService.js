import cron from 'node-cron';
import moment from 'moment-timezone';
import ScheduledNotification from '../models/ScheduledNotification.js';
import sendEmail from './emailService.js';

// Max notifications to process in one run
const MAX_NOTIFICATIONS_PER_RUN = parseInt(process.env.MAX_NOTIFICATIONS_PER_RUN, 10) || 500;

// Process pending notifications and send emails
const processPendingNotifications = async () => {
  let BATCH_SIZE = parseInt(process.env.NOTIFICATION_BATCH_SIZE, 10);
  BATCH_SIZE = (isNaN(BATCH_SIZE) || BATCH_SIZE < 1) ? 10 : BATCH_SIZE;
  let totalProcessedThisRun = 0;
  let totalSentThisRun = 0;
  let totalFailedThisRun = 0;
  let batchesProcessedThisRun = 0;
  const overallStartTime = moment();

  try {
    while (totalProcessedThisRun < MAX_NOTIFICATIONS_PER_RUN) {
      const now = new Date();
      // Find pending notifications that should be sent now
      const pendingNotifications = await ScheduledNotification.find({
        status: 'pending',
        scheduledTimeUTC: { $lte: now },
      }).limit(BATCH_SIZE);

      if (pendingNotifications.length === 0) break;

      batchesProcessedThisRun++;
      if (batchesProcessedThisRun === 1) {
        console.log(`[NotificationService] Cron job triggered at ${overallStartTime.toISOString()} and found work. Will process in batches of ${BATCH_SIZE}.`);
      }
      const internalBatchStartTime = moment();
      console.log(`[NotificationService] Processing internal batch ${batchesProcessedThisRun}: Found ${pendingNotifications.length} notifications.`);

      let currentBatchSuccessCount = 0;
      let currentBatchFailureCount = 0;

      // Send emails for each notification in the batch
      const emailProcessingPromises = pendingNotifications.map(async (notification) => {
        try {
          const htmlBody = notification.messageBody.replace(/\n/g, '<br/>');
          await sendEmail({
            to: notification.recipientEmail,
            subject: notification.subject,
            html: htmlBody,
            text: notification.messageBody,
          });
          notification.status = 'sent';
          notification.sentAt = new Date();
          currentBatchSuccessCount++;
        } catch (emailError) {
          console.error(`[NotificationService] Failed to process email for notification ID ${notification._id} to ${notification.recipientEmail}. Error: ${emailError.message}`);
          notification.status = 'failed';
          notification.lastAttemptError = String(emailError.message || emailError);
          currentBatchFailureCount++;
        } finally {
          notification.attempts = (notification.attempts || 0) + 1;
          try {
            await notification.save();
          } catch (saveError) {
            console.error(`[NotificationService] CRITICAL: Failed to save notification status for ID ${notification._id} after processing. Error: ${saveError.message}`);
          }
        }
        return notification;
      });

      console.log(`[NotificationService] All ${pendingNotifications.length} email sending tasks in internal batch ${batchesProcessedThisRun} have been initiated.`);
      await Promise.all(emailProcessingPromises);

      totalProcessedThisRun += pendingNotifications.length;
      totalSentThisRun += currentBatchSuccessCount;
      totalFailedThisRun += currentBatchFailureCount;

      const internalBatchEndTime = moment();
      const internalBatchDurationMs = internalBatchEndTime.diff(internalBatchStartTime);
      console.log(`[NotificationService] Internal batch ${batchesProcessedThisRun} complete in ${internalBatchDurationMs}ms. Processed: ${pendingNotifications.length}. Sent: ${currentBatchSuccessCount}. Failed: ${currentBatchFailureCount}.`);

      if (pendingNotifications.length < BATCH_SIZE) break;
    }
    if (totalProcessedThisRun > 0) {
      const overallEndTime = moment();
      const overallDurationMs = overallEndTime.diff(overallStartTime);
      console.log(`[NotificationService] Overall processing for this run complete in ${overallDurationMs}ms. Total processed: ${totalProcessedThisRun} in ${batchesProcessedThisRun} internal batch(es). Total sent: ${totalSentThisRun}. Total failed: ${totalFailedThisRun}.`);
    }
    if (totalProcessedThisRun >= MAX_NOTIFICATIONS_PER_RUN) {
      console.warn(`[NotificationService] Reached MAX_NOTIFICATIONS_PER_RUN (${MAX_NOTIFICATIONS_PER_RUN}). More notifications might be pending for the next run.`);
    }
  } catch (error) {
    console.error('[NotificationService] General error during processing pending notifications:', error);
  }
};

// Start the notification service with cron
export const startNotificationService = () => {
  const cronSchedule = process.env.NOTIFICATION_SCHEDULER_CRON || '* * * * *'; // Default: every minute
  if (cron.validate(cronSchedule)) {
    cron.schedule(cronSchedule, () => {
      processPendingNotifications().catch(err => {
        console.error('[NotificationService] Unhandled error in notification processing service called by cron job:', err);
      });
    });
    console.log(`[NotificationService] Notification service started. Will run with pattern "${cronSchedule}".`);
  } else {
    console.error(`[NotificationService] Invalid CRON pattern for notification service: "${cronSchedule}". Job not started.`);
  }
};
