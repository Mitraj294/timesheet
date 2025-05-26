import ScheduledNotification from '../models/ScheduledNotification.js';
import sendEmail from '../utils/sendEmail.js';
import moment from 'moment-timezone';

const processPendingNotifications = async () => {
  console.log(`[NotificationScheduler] Starting job at ${moment().toISOString()}`);
  const now = new Date();

  try {
    const pendingNotifications = await ScheduledNotification.find({
      status: 'pending',
      scheduledTimeUTC: { $lte: now },
    }).limit(1000);

    if (pendingNotifications.length === 0) {
      console.log('[NotificationScheduler] No pending notifications to process at this time.');
      return;
    }

    console.log(`[NotificationScheduler] Found ${pendingNotifications.length} pending notifications. Starting batch processing.`);

    let successCount = 0;
    let failureCount = 0;

    const emailProcessingPromises = pendingNotifications.map(async (notification, index) => {
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
        successCount++;
      } catch (emailError) {
        console.error(`[NotificationScheduler] Failed to process email for notification ID ${notification._id} to ${notification.recipientEmail}. Error: ${emailError.message}`);
        notification.status = 'failed';
        notification.lastAttemptError = emailError.message;
        failureCount++;
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

    console.log(`[NotificationScheduler] All ${pendingNotifications.length} email sending tasks in the batch have been initiated concurrently. Waiting for individual completions...`);

    await Promise.all(emailProcessingPromises);
    
    console.log(`[NotificationScheduler] Batch processing complete. Total processed: ${pendingNotifications.length}. Sent successfully: ${successCount}. Failed: ${failureCount}.`);

  } catch (error) {
    console.error('[NotificationScheduler] General error during processing pending notifications:', error);
  }
};

export default processPendingNotifications;
