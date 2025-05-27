import EmployerSetting from '../models/EmployerSetting.js';
import ScheduledNotification from '../models/ScheduledNotification.js';
import { utcToZonedTime, zonedTimeToUtc, set } from 'date-fns-tz';
import { nextDay as dfnsNextDay, getDay, isBefore, startOfDay, addDays } from 'date-fns';

const dayMapping = { // date-fns uses 0 for Sunday, 1 for Monday, ..., 6 for Saturday
    sunday: 0, monday: 1, tuesday: 2, wednesday: 3, thursday: 4, friday: 5, saturday: 6,
};
const dayNames = [ // For getDay() index
    'sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday',
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
    if (!localTimeStr) {
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

    const nowInSystemTime = new Date();
    const nowInEmployerTZ = utcToZonedTime(nowInSystemTime, employerTimezone);

    let prospectiveDateInEmployerTZ = set(nowInEmployerTZ, { hours, minutes, seconds: 0, milliseconds: 0 });

    while (getDay(prospectiveDateInEmployerTZ) !== targetDayNumber || isBefore(prospectiveDateInEmployerTZ, nowInEmployerTZ)) {
        if (getDay(prospectiveDateInEmployerTZ) === targetDayNumber && isBefore(prospectiveDateInEmployerTZ, nowInEmployerTZ)) {
            prospectiveDateInEmployerTZ = addDays(prospectiveDateInEmployerTZ, 1);
        }
        prospectiveDateInEmployerTZ = dfnsNextDay(startOfDay(prospectiveDateInEmployerTZ), targetDayNumber);
        prospectiveDateInEmployerTZ = set(prospectiveDateInEmployerTZ, { hours, minutes, seconds: 0, milliseconds: 0 });
    }

    // Convert the calculated local time back to UTC for storage
    return zonedTimeToUtc(prospectiveDateInEmployerTZ, employerTimezone);
}


export const updateEmployerSettingsAndReschedule = async (req, res) => {
    try {
        console.log('[Rescheduler] Attempting to update employer settings and reschedule notifications.');
        const employerId = req.user.id;
        const settingsDataToUpdate = req.body;

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

        if (settingsDataToUpdate.globalNotificationTimes) {
            console.log('[Rescheduler] globalNotificationTimes found in update. Proceeding to reschedule.');
            const employerTimezone = updatedSettings.timezone || 'UTC';
            console.log(`[Rescheduler] Using timezone: ${employerTimezone} for employerId: ${employerId}`);

            const allPendingNotifications = await ScheduledNotification.find({
                employerId: employerId,
                status: 'pending',
            });
            console.log(`[Rescheduler] Found ${allPendingNotifications.length} total pending notifications for employer ${employerId}.`);

            for (const notification of allPendingNotifications) {
                const localScheduledDate = utcToZonedTime(notification.scheduledTimeUTC, employerTimezone);
                const effectiveDayIndex = getDay(localScheduledDate); // 0 for Sunday, 1 for Monday, etc.
                const dayKey = dayNames[effectiveDayIndex]; // 'sunday', 'monday', etc.

                // Check if the global time for this notification's effective day was actually part of the update
                if (settingsDataToUpdate.globalNotificationTimes.hasOwnProperty(dayKey)) {
                    console.log(`[Rescheduler] Processing notification ID: ${notification._id} (Type: ${notification.notificationType}). Its effective day '${dayKey}' had its time setting updated.`);
                    const newLocalTimeStr = settingsDataToUpdate.globalNotificationTimes[dayKey];
                    console.log(`[Rescheduler] For effective dayKey '${dayKey}', newLocalTimeStr is '${newLocalTimeStr}'`);

                    const newScheduledTimeUTC = calculateNextScheduledUTC(dayKey, newLocalTimeStr, employerTimezone);
                    console.log(`[Rescheduler] Calculated newScheduledTimeUTC for notification ${notification._id}: ${newScheduledTimeUTC}`);

                    if (newScheduledTimeUTC) {
                        if (!notification.scheduledTimeUTC || notification.scheduledTimeUTC.toISOString() !== newScheduledTimeUTC.toISOString()) {
                            console.log(`[Rescheduler] Updating notification ID: ${notification._id}. Old time: ${notification.scheduledTimeUTC?.toISOString()}, New time: ${newScheduledTimeUTC.toISOString()}`);
                            notification.scheduledTimeUTC = newScheduledTimeUTC;
                            notification.attempts = 0;
                            await notification.save();
                            console.log(`[Rescheduler] Notification ID: ${notification._id} successfully saved with new time.`);
                        } else {
                            console.log(`[Rescheduler] Notification ID: ${notification._id}. New time is same as old. No update needed.`);
                        }
                    } else {
                        if (notification.status === 'pending') {
                            notification.status = 'cancelled_by_setting_change';
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