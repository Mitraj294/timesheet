import cron from 'node-cron';
import moment from 'moment-timezone';
import processPendingNotificationsService from '../services/notificationScheduler.js';

export const startNotificationScheduler = () => {
  const cronSchedule = process.env.NOTIFICATION_SCHEDULER_CRON || '* * * * *';
  
  if (cron.validate(cronSchedule)) {
    cron.schedule(cronSchedule, () => {
      processPendingNotificationsService().catch(err => {
        console.error('[Scheduler] Unhandled error in notification processing service called by cron job:', err);
      });
    });
    console.log(`[Scheduler] Notification scheduler started. Will run with pattern "${cronSchedule}".`);
  } else {
    console.error(`[Scheduler] Invalid CRON pattern for notification scheduler: "${cronSchedule}". Job not started.`);
  }
};
