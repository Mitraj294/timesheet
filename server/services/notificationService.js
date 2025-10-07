import cron from "node-cron";
import moment from "moment-timezone";
import ScheduledNotification from "../models/ScheduledNotification.js";
import sendEmail from "./emailService.js";
import config from "../config/env.js";

// Max notifications to process in one run (environment-aware)
const MAX_NOTIFICATIONS_PER_RUN = config.batch.maxNotificationsPerRun;

// Process pending notifications and send emails
const processPendingNotifications = async () => {
  let BATCH_SIZE = config.batch.notificationBatchSize;
  let totalProcessedThisRun = 0;
  let totalSentThisRun = 0;
  let totalFailedThisRun = 0;
  let batchesProcessedThisRun = 0;

  try {
    while (totalProcessedThisRun < MAX_NOTIFICATIONS_PER_RUN) {
      const now = new Date();
      // Find pending notifications that should be sent now
      const pendingNotifications = await ScheduledNotification.find({
        status: "pending",
        scheduledTimeUTC: { $lte: now },
      }).limit(BATCH_SIZE);

      if (pendingNotifications.length === 0) break;

      batchesProcessedThisRun++;

      let currentBatchSuccessCount = 0;
      let currentBatchFailureCount = 0;

      // Send emails for each notification in the batch
      const emailProcessingPromises = pendingNotifications.map(
        async (notification) => {
          try {
            const htmlBody = notification.messageBody.replace(/\n/g, "<br/>");
            await sendEmail({
              to: notification.recipientEmail,
              subject: notification.subject,
              html: htmlBody,
              text: notification.messageBody,
            });
            notification.status = "sent";
            notification.sentAt = new Date();
            currentBatchSuccessCount++;
          } catch (emailError) {
            console.error(`Email to ${notification.recipientEmail} failed:`, emailError.message);
            notification.status = "failed";
            notification.lastAttemptError = String(
              emailError.message || emailError,
            );
            currentBatchFailureCount++;
          } finally {
            notification.attempts = (notification.attempts || 0) + 1;
            try {
              await notification.save();
            } catch (saveError) {
              console.error(`Failed to save notification ${notification._id}:`, saveError.message);
            }
          }
          return notification;
        },
      );

      await Promise.all(emailProcessingPromises);

      totalProcessedThisRun += pendingNotifications.length;
      totalSentThisRun += currentBatchSuccessCount;
      totalFailedThisRun += currentBatchFailureCount;

      if (pendingNotifications.length < BATCH_SIZE) break;
    }
    if (totalProcessedThisRun > 0) {
      console.log(`Notifications: ${totalSentThisRun} sent, ${totalFailedThisRun} failed`);
    }
  } catch (error) {
    console.error("Notification processing error:", error.message);
  }
};

let notificationCronJob = null;

// Start the notification service with cron
export const startNotificationService = () => {
  // Don't start cron jobs if disabled or in test environment
  if (!config.cron.enabled || config.isTest) {
    console.log(`Notification cron job disabled (${config.env})`);
    return;
  }
  
  const cronSchedule = config.cron.notificationSchedule;
  
  if (cron.validate(cronSchedule)) {
    notificationCronJob = cron.schedule(
      cronSchedule, 
      () => {
        processPendingNotifications().catch((err) => {
          console.error("Notification service error:", err.message);
        });
      },
      {
        scheduled: true,
        timezone: config.cron.timezone,
      }
    );
    
    console.log(`Notification service started (${cronSchedule}, ${config.cron.timezone})`);
  } else {
    console.error(`Invalid CRON pattern: "${cronSchedule}"`);
  }
};

export const stopNotificationService = () => {
  if (notificationCronJob) {
    notificationCronJob.stop();
    notificationCronJob = null;
    console.log('[NotificationService] Notification cron job stopped.');
  }
};
