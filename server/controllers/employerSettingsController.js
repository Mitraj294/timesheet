import EmployerSetting from "../models/EmployerSetting.js";
import ScheduledNotification from "../models/ScheduledNotification.js";
import { toZonedTime, fromZonedTime } from "date-fns-tz";
import {
  set,
  nextDay as dfnsNextDay,
  getDay,
  isBefore,
  startOfDay,
  addDays,
} from "date-fns";

// Map day names to numbers (Sunday = 0, Monday = 1, ...)
const dayMapping = {
  sunday: 0,
  monday: 1,
  tuesday: 2,
  wednesday: 3,
  thursday: 4,
  friday: 5,
  saturday: 6,
};
const dayNames = [
  "sunday",
  "monday",
  "tuesday",
  "wednesday",
  "thursday",
  "friday",
  "saturday",
];

/**
 * Get next occurrence of a day/time in a timezone, return as UTC Date.
 * Returns null if localTimeStr is empty (disabled).
 */
function calculateNextScheduledUTC(
  dayOfWeekName,
  localTimeStr,
  employerTimezone,
) {
  if (!localTimeStr) return null;
  const targetDayNumber = dayMapping[dayOfWeekName.toLowerCase()];
  if (targetDayNumber === undefined) {
    console.error(
      `[SchedulerHelper] Invalid day of week name: ${dayOfWeekName}`,
    );
    return null;
  }
  const [hours, minutes] = localTimeStr.split(":").map(Number);
  if (
    isNaN(hours) ||
    isNaN(minutes) ||
    hours < 0 ||
    hours > 23 ||
    minutes < 0 ||
    minutes > 59
  ) {
    console.error(
      `[SchedulerHelper] Invalid time string: ${localTimeStr} for day ${dayOfWeekName}`,
    );
    return null;
  }
  const nowInSystemTime = new Date();
  const nowInEmployerTZ = toZonedTime(nowInSystemTime, employerTimezone);
  let prospectiveDateInEmployerTZ = set(nowInEmployerTZ, {
    hours,
    minutes,
    seconds: 0,
    milliseconds: 0,
  });
  // Find the next correct day/time
  while (
    getDay(prospectiveDateInEmployerTZ) !== targetDayNumber ||
    isBefore(prospectiveDateInEmployerTZ, nowInEmployerTZ)
  ) {
    if (
      getDay(prospectiveDateInEmployerTZ) === targetDayNumber &&
      isBefore(prospectiveDateInEmployerTZ, nowInEmployerTZ)
    ) {
      prospectiveDateInEmployerTZ = addDays(prospectiveDateInEmployerTZ, 1);
    }
    prospectiveDateInEmployerTZ = dfnsNextDay(
      startOfDay(prospectiveDateInEmployerTZ),
      targetDayNumber,
    );
    prospectiveDateInEmployerTZ = set(prospectiveDateInEmployerTZ, {
      hours,
      minutes,
      seconds: 0,
      milliseconds: 0,
    });
  }
  // Convert local time to UTC for storage
  return fromZonedTime(prospectiveDateInEmployerTZ, employerTimezone);
}

// Update employer settings and reschedule notifications if needed
export const updateEmployerSettingsAndReschedule = async (req, res) => {
  try {
    const employerId = req.user.id;
    const settingsDataToUpdate = req.body;

    // Update or create settings for employer
    const updatedSettings = await EmployerSetting.findOneAndUpdate(
      { employerId: employerId },
      { $set: settingsDataToUpdate },
      { new: true, upsert: true, runValidators: true },
    );

    if (!updatedSettings) {
      return res
        .status(404)
        .json({ message: "Employer settings could not be updated or found." });
    }

    // If notification times changed, update scheduled notifications
    if (settingsDataToUpdate.globalNotificationTimes) {
      const employerTimezone = updatedSettings.timezone || "UTC";
      const allPendingNotifications = await ScheduledNotification.find({
        employerId: employerId,
        status: "pending",
      });

      for (const notification of allPendingNotifications) {
        const localScheduledDate = toZonedTime(
          notification.scheduledTimeUTC,
          employerTimezone,
        );
        const effectiveDayIndex = getDay(localScheduledDate);
        const dayKey = dayNames[effectiveDayIndex];

        // Only update notifications for days that changed
        if (
          settingsDataToUpdate.globalNotificationTimes.hasOwnProperty(dayKey)
        ) {
          const newLocalTimeStr =
            settingsDataToUpdate.globalNotificationTimes[dayKey];
          const newScheduledTimeUTC = calculateNextScheduledUTC(
            dayKey,
            newLocalTimeStr,
            employerTimezone,
          );

          if (newScheduledTimeUTC) {
            // Only update if time actually changed
            if (
              !notification.scheduledTimeUTC ||
              notification.scheduledTimeUTC.toISOString() !==
                newScheduledTimeUTC.toISOString()
            ) {
              notification.scheduledTimeUTC = newScheduledTimeUTC;
              notification.attempts = 0;
              await notification.save();
            }
          } else {
            // If time is disabled, cancel the notification
            if (notification.status === "pending") {
              notification.status = "cancelled_by_setting_change";
              await notification.save();
            }
          }
        }
      }
    }

    res.status(200).json({
      message: "Employer settings updated successfully.",
      settings: updatedSettings,
    });
  } catch (error) {
    console.error(
      "Error updating employer settings and rescheduling notifications:",
      error,
    );
    res.status(500).json({ message: "Server error while updating settings." });
  }
};
