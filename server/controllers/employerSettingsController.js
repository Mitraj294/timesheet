import EmployerSetting from '../models/EmployerSetting.js';
import ScheduledNotification from '../models/ScheduledNotification.js';
// A robust date/time library is crucial for timezone handling.
// Ensure you have date-fns and date-fns-tz installed: npm install date-fns date-fns-tz
import { utcToZonedTime, zonedTimeToUtc, set } from 'date-fns-tz';
import { nextDay as dfnsNextDay, getDay, isBefore, startOfDay, addDays } from 'date-fns';

const dayMapping = { // date-fns uses 0 for Sunday, 1 for Monday, ..., 6 for Saturday
    sunday: 0, monday: 1, tuesday: 2, wednesday: 3, thursday: 4, friday: 5, saturday: 6,
};
const dayNames = [ // For getDay() index
    'sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'
];


/**
 * Calculates the next occurrence of a given day and time in a specific timezone,
 * and returns it as a UTC Date object.
 * @param {string} dayOfWeekName - e.g., 'monday', 'tuesday'
 * @param {string} localTimeStr - e.g., "14:00" or "" (empty string means disabled)
 * @param {string} employerTimezone - e.g., 'America/New_York', 'UTC'
 * @returns {Date|null} - The next scheduled time in UTC, or null if localTimeStr is empty.
 */
function calculateNextScheduledUTC(dayOfWeekName, localTimeStr, employerTimezone) {
    if (!localTimeStr) { // If time is empty, it means this day's scheduled notification is disabled
        return null;
    }

    const targetDayNumber = dayMapping[dayOfWeekName.toLowerCase()];
    if (targetDayNumber === undefined) {
        console.error(`[SchedulerHelper] Invalid day of week name: ${dayOfWeekName}`);
        return null; // Or throw an error
    }

    const [hours, minutes] = localTimeStr.split(':').map(Number);
    if (isNaN(hours) || isNaN(minutes) || hours < 0 || hours > 23 || minutes < 0 || minutes > 59) {
        console.error(`[SchedulerHelper] Invalid time string: ${localTimeStr} for day ${dayOfWeekName}`);
        return null; // Or throw an error
    }

    const nowInSystemTime = new Date(); // Current time in system's local (usually UTC on servers)
    const nowInEmployerTZ = utcToZonedTime(nowInSystemTime, employerTimezone);

    // Start with today in the employer's timezone, then set the target time.
    let prospectiveDateInEmployerTZ = set(nowInEmployerTZ, { hours, minutes, seconds: 0, milliseconds: 0 });

    // Loop to find the correct future date:
    // It must be the targetDayNumber AND it must be in the future (or now, if time hasn't passed).
    while (getDay(prospectiveDateInEmployerTZ) !== targetDayNumber || isBefore(prospectiveDateInEmployerTZ, nowInEmployerTZ)) {
        // If it's already the correct day of the week, but the time has passed for today,
        // advance by one day to ensure dfnsNextDay gives the *next* week's target day.
        if (getDay(prospectiveDateInEmployerTZ) === targetDayNumber && isBefore(prospectiveDateInEmployerTZ, nowInEmployerTZ)) {
            prospectiveDateInEmployerTZ = addDays(prospectiveDateInEmployerTZ, 1);
        }
        // Get the start of the next occurrence of targetDayNumber
        prospectiveDateInEmployerTZ = dfnsNextDay(startOfDay(prospectiveDateInEmployerTZ), targetDayNumber);
        // Set the desired time on that day
        prospectiveDateInEmployerTZ = set(prospectiveDateInEmployerTZ, { hours, minutes, seconds: 0, milliseconds: 0 });
    }

    // Convert the calculated local time back to UTC for storage
    return zonedTimeToUtc(prospectiveDateInEmployerTZ, employerTimezone);
}


// This is a conceptual controller function. Integrate this logic into your existing
// route handler for updating employer settings.
export const updateEmployerSettingsAndReschedule = async (req, res) => {
    try {
        console.log('[Rescheduler] Attempting to update employer settings and reschedule notifications.');
        const employerId = req.user.id; // Assuming employerId comes from authenticated user
        const settingsDataToUpdate = req.body; // Contains globalNotificationTimes, timezone, etc.

        // 1. Update or create EmployerSetting document
        const updatedSettings = await EmployerSetting.findOneAndUpdate(
            { employerId: employerId },
            { $set: settingsDataToUpdate },
            { new: true, upsert: true, runValidators: true }
        );
        console.log('[Rescheduler] settingsDataToUpdate received:', JSON.stringify(settingsDataToUpdate, null, 2));

        if (!updatedSettings) {
            console.error('[Rescheduler] Employer settings could not be updated or found for employerId:', employerId);
            return res.status(404).json({ message: 'Employer settings could not be updated or found.' });
        }
        console.log('[Rescheduler] Employer settings updated. New settings:', JSON.stringify(updatedSettings, null, 2));

        // 2. Reschedule 'daily_summary' notifications if globalNotificationTimes were part of the update
        if (settingsDataToUpdate.globalNotificationTimes) {
            console.log('[Rescheduler] globalNotificationTimes found in update. Proceeding to reschedule.');
            const employerTimezone = updatedSettings.timezone || 'UTC'; // Fallback to UTC if not set
            console.log(`[Rescheduler] Using timezone: ${employerTimezone} for employerId: ${employerId}`);

            // Fetch ALL pending notifications for the employer
            const allPendingNotifications = await ScheduledNotification.find({
                employerId: employerId,
                status: 'pending',
                // No longer filtering by notificationType or referenceDayOfWeek here
            });
            console.log(`[Rescheduler] Found ${allPendingNotifications.length} total pending notifications for employer ${employerId}.`);

            for (const notification of allPendingNotifications) {
                // Determine the effective day of the week for this notification in employer's timezone
                const localScheduledDate = utcToZonedTime(notification.scheduledTimeUTC, employerTimezone);
                const effectiveDayIndex = getDay(localScheduledDate); // 0 for Sunday, 1 for Monday, etc.
                const dayKey = dayNames[effectiveDayIndex]; // 'sunday', 'monday', etc.

                // Check if the global time for this notification's effective day was actually part of the update
                if (settingsDataToUpdate.globalNotificationTimes.hasOwnProperty(dayKey)) {
                    console.log(`[Rescheduler] Processing notification ID: ${notification._id} (Type: ${notification.notificationType}). Its effective day '${dayKey}' had its time setting updated.`);
                    const newLocalTimeStr = settingsDataToUpdate.globalNotificationTimes[dayKey]; // e.g., "14:00" or ""
                    console.log(`[Rescheduler] For effective dayKey '${dayKey}', newLocalTimeStr is '${newLocalTimeStr}'`);

                    const newScheduledTimeUTC = calculateNextScheduledUTC(dayKey, newLocalTimeStr, employerTimezone);
                    console.log(`[Rescheduler] Calculated newScheduledTimeUTC for notification ${notification._id}: ${newScheduledTimeUTC}`);

                    if (newScheduledTimeUTC) { // If null, it means the day's notification is effectively disabled by the new setting
                        // Only update if the time actually changes to avoid unnecessary writes
                        if (!notification.scheduledTimeUTC || notification.scheduledTimeUTC.toISOString() !== newScheduledTimeUTC.toISOString()) {
                            console.log(`[Rescheduler] Updating notification ID: ${notification._id}. Old time: ${notification.scheduledTimeUTC?.toISOString()}, New time: ${newScheduledTimeUTC.toISOString()}`);
                            notification.scheduledTimeUTC = newScheduledTimeUTC;
                            notification.attempts = 0; // Reset attempts
                            // Preserve original notificationType and referenceDayOfWeek unless explicitly changing them
                            await notification.save();
                            console.log(`[Rescheduler] Notification ID: ${notification._id} successfully saved with new time.`);
                        } else {
                            console.log(`[Rescheduler] Notification ID: ${notification._id}. New time is same as old. No update needed.`);
                        }
                    } else {
                        // If newScheduledTimeUTC is null, the daily notification for this day is effectively disabled.
                        if (notification.status === 'pending') { // Only act if it was pending
                            notification.status = 'cancelled_by_setting_change'; // Custom status
                            await notification.save();
                            console.log(`[Rescheduler] Notification ID: ${notification._id} (effective day '${dayKey}') was disabled by new setting. Status changed to '${notification.status}'.`);
                        }
                    }
                } else {
                    console.log(`[Rescheduler] Skipping notification ID: ${notification._id} (Type: ${notification.notificationType}). Its effective day '${dayKey}' did not have its time setting updated.`);
                }
            }
        }

        res.status(200).json({ message: 'Employer settings updated successfully.', settings: updatedSettings });
    } catch (error) {
        console.error('Error updating employer settings and rescheduling notifications:', error);
        res.status(500).json({ message: 'Server error while updating settings.' });
    }
};