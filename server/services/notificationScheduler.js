import ScheduledNotification from '../models/ScheduledNotification.js';
import sendEmail from '../utils/sendEmail.js';
import moment from 'moment-timezone';
const MAX_NOTIFICATIONS_PER_RUN = parseInt(process.env.MAX_NOTIFICATIONS_PER_RUN, 10) || 500;
const processPendingNotifications = async () => {
  let BATCH_SIZE = parseInt(process.env.NOTIFICATION_BATCH_SIZE, 10);
  BATCH_SIZE = (isNaN(BATCH_SIZE) || BATCH_SIZE < 1) ? 10 : BATCH_SIZE; // Default to 10 if not set, invalid, or less than 1
  let totalProcessedThisRun = 0;
  let totalSentThisRun = 0;
  let totalFailedThisRun = 0;
  let batchesProcessedThisRun = 0;
  const overallStartTime = moment();

  try {
    while (totalProcessedThisRun < MAX_NOTIFICATIONS_PER_RUN) {
      const now = new Date();
      const pendingNotifications = await ScheduledNotification.find({
        status: 'pending',
        scheduledTimeUTC: { $lte: now },
      }).limit(BATCH_SIZE);

      if (pendingNotifications.length === 0) {
        break; 
      }

      batchesProcessedThisRun++;
      // Log trigger only on the first internal batch found in this run
      if (batchesProcessedThisRun === 1) { 
        console.log(`[Scheduler] Cron job triggered at ${overallStartTime.toISOString()} and found work. Will process in batches of ${BATCH_SIZE}.`);
      }
      const internalBatchStartTime = moment();
      console.log(`[NotificationScheduler] Processing internal batch ${batchesProcessedThisRun}: Found ${pendingNotifications.length} notifications.`);

      let currentBatchSuccessCount = 0;
      let currentBatchFailureCount = 0;

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
          console.error(`[NotificationScheduler] Failed to process email for notification ID ${notification._id} to ${notification.recipientEmail}. Error: ${emailError.message}`);
          notification.status = 'failed';
          notification.lastAttemptError = String(emailError.message || emailError);
          currentBatchFailureCount++;
        } finally {
          notification.attempts = (notification.attempts || 0) + 1;
          try {
              await notification.save();
          } catch (saveError) {
              console.error(`[NotificationScheduler] CRITICAL: Failed to save notification status for ID ${notification._id} after processing. Error: ${saveError.message}`);
          }
        }
        return notification;
      });

      console.log(`[NotificationScheduler] All ${pendingNotifications.length} email sending tasks in internal batch ${batchesProcessedThisRun} have been initiated.`);
      await Promise.all(emailProcessingPromises);
      
      totalProcessedThisRun += pendingNotifications.length;
      totalSentThisRun += currentBatchSuccessCount;
      totalFailedThisRun += currentBatchFailureCount;

      const internalBatchEndTime = moment();
      const internalBatchDurationMs = internalBatchEndTime.diff(internalBatchStartTime);
      console.log(`[NotificationScheduler] Internal batch ${batchesProcessedThisRun} complete in ${internalBatchDurationMs}ms. Processed: ${pendingNotifications.length}. Sent: ${currentBatchSuccessCount}. Failed: ${currentBatchFailureCount}.`);

      if (pendingNotifications.length < BATCH_SIZE) {
        break; 
      }
    } 
    if (totalProcessedThisRun > 0) {
      const overallEndTime = moment();
      const overallDurationMs = overallEndTime.diff(overallStartTime);
      console.log(`[NotificationScheduler] Overall processing for this run complete in ${overallDurationMs}ms. Total processed: ${totalProcessedThisRun} in ${batchesProcessedThisRun} internal batch(es). Total sent: ${totalSentThisRun}. Total failed: ${totalFailedThisRun}.`);
    }
    if (totalProcessedThisRun >= MAX_NOTIFICATIONS_PER_RUN) {
      console.warn(`[NotificationScheduler] Reached MAX_NOTIFICATIONS_PER_RUN (${MAX_NOTIFICATIONS_PER_RUN}). More notifications might be pending for the next run.`);
    }

  } catch (error) {
    console.error('[NotificationScheduler] General error during processing pending notifications:', error);
  }
};

export default processPendingNotifications;
