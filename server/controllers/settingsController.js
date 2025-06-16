// /home/digilab/timesheet/server/controllers/settingsController.js
import mongoose from "mongoose";
import EmployerSetting from "../models/EmployerSetting.js";
import ScheduledNotification from "../models/ScheduledNotification.js";
import moment from "moment-timezone";

const DAYS_OF_WEEK_LOWERCASE = [
  "monday",
  "tuesday",
  "wednesday",
  "thursday",
  "friday",
  "saturday",
  "sunday",
];

// Get error message from error object
const getErrorMessage = (error) => {
  if (error.errors) {
    return Object.values(error.errors)
      .map((e) => e.message)
      .join(", ");
  }
  return error.message || "An unexpected server error occurred";
};

// Calculate next UTC date for a given day/time in a timezone
const calculateNextScheduledUTC = (
  dayOfWeekStr,
  localTimeHHMM,
  timezoneStr,
) => {
  if (
    !localTimeHHMM ||
    typeof localTimeHHMM !== "string" ||
    !localTimeHHMM.includes(":")
  ) {
    return null;
  }
  const [hours, minutes] = localTimeHHMM.split(":").map(Number);
  const nowInEmployerTZ = moment.tz(timezoneStr);
  const dayMapping = {
    sunday: 0,
    monday: 1,
    tuesday: 2,
    wednesday: 3,
    thursday: 4,
    friday: 5,
    saturday: 6,
  };
  const targetDayNumber = dayMapping[dayOfWeekStr.toLowerCase()];
  if (typeof targetDayNumber !== "number") {
    return null;
  }
  let scheduledMomentInEmployerTZ = nowInEmployerTZ
    .clone()
    .day(targetDayNumber)
    .hour(hours)
    .minute(minutes)
    .second(0)
    .millisecond(0);
  if (scheduledMomentInEmployerTZ.isBefore(nowInEmployerTZ)) {
    scheduledMomentInEmployerTZ.add(1, "week");
  }
  return scheduledMomentInEmployerTZ.utc().toDate();
};

// Get employer settings (for employer or employee's employer)
export const getEmployerSettings = async (req, res) => {
  if (!req.user) {
    return res.status(401).json({ message: "Not authorized, no token" });
  }
  let targetEmployerId;
  if (req.user.role === "employer") {
    targetEmployerId = req.user.id;
  } else if (req.user.role === "employee") {
    targetEmployerId = req.user.employerId;
    if (!targetEmployerId) {
      return res
        .status(400)
        .json({ message: "Employer ID not found for this employee." });
    }
  } else {
    return res
      .status(403)
      .json({ message: "User role not permitted to access settings." });
  }
  try {
    let settings = await EmployerSetting.findOne({
      employerId: targetEmployerId,
    });
    if (!settings) {
      // Create default settings if not found
      const defaultSettings = {
        employerId: targetEmployerId,
        tabletViewRecordingType: "Automatically Record",
        tabletViewPasswordRequired: false,
        timesheetStartDayOfWeek: "Monday",
        timesheetIsLunchBreakDefault: true,
        timesheetHideWage: false,
        timesheetAllowOldEdits: false,
        timesheetStartDate: null,
        isTravelChargeByDefault: true,
        is24Hour: false,
        isProjectClient: false,
        isNoteNeeded: false,
        isWorkPerformed: false,
        reassignTimesheet: true,
        showXero: false,
        showLocation: false,
        employeeCanCreateProject: false,
        defaultTimesheetViewType: "Weekly",
        globalNotificationTimes: {
          monday: "",
          tuesday: "",
          wednesday: "",
          thursday: "",
          friday: "",
          saturday: "",
          sunday: "",
        },
        actionNotificationEmail: "",
        timezone: process.env.SERVER_TIMEZONE || "UTC",
        reportColumns: [],
        weeklyReportEmail: "",
        timesheetIsProjectClientRequired: false,
        timesheetAreNotesRequired: false,
      };
      settings = new EmployerSetting(defaultSettings);
      await settings.save();
      return res.json(settings);
    }
    // Auto-rollover notification times if needed
    let needsSave = false;
    const employerTimezone = settings.timezone || "UTC";
    for (const day of DAYS_OF_WEEK_LOWERCASE) {
      const storedUtcDate = settings.globalNotificationTimes?.[day];
      if (storedUtcDate instanceof Date) {
        const nowInEmployerTZ = moment.tz(employerTimezone);
        const scheduledMomentInEmployerTZ = moment.tz(
          storedUtcDate,
          employerTimezone,
        );
        if (scheduledMomentInEmployerTZ.isBefore(nowInEmployerTZ)) {
          const timeHHMM = scheduledMomentInEmployerTZ.format("HH:mm");
          const nextOccurrenceUTC = calculateNextScheduledUTC(
            day,
            timeHHMM,
            employerTimezone,
          );
          settings.globalNotificationTimes[day] = nextOccurrenceUTC;
          needsSave = true;
        }
      }
    }
    if (needsSave) {
      await settings.save();
    }
    res.json(settings);
  } catch (error) {
    res.status(500).json({ message: getErrorMessage(error) });
  }
};

// Update employer settings and reschedule notifications
export const updateEmployerSettings = async (req, res, next) => {
  if (!req.user || req.user.role !== "employer") {
    return res.status(403).json({ message: "Access denied." });
  }
  try {
    const employerId = req.user.id;
    const settingsToUpdate = req.body;
    const clientGlobalNotificationTimes =
      settingsToUpdate.globalNotificationTimes;
    let currentSettings = await EmployerSetting.findOne({ employerId });
    if (!currentSettings) {
      currentSettings = new EmployerSetting({
        employerId,
        timezone: process.env.SERVER_TIMEZONE || "UTC",
      });
    }
    const employerTimezone =
      settingsToUpdate.timezone || currentSettings.timezone || "UTC";
    // Convert notification times to UTC dates
    const processedGlobalNotificationTimes = {};
    if (clientGlobalNotificationTimes) {
      for (const day of DAYS_OF_WEEK_LOWERCASE) {
        const localTimeHHMM = clientGlobalNotificationTimes[day];
        processedGlobalNotificationTimes[day] = calculateNextScheduledUTC(
          day,
          localTimeHHMM,
          employerTimezone,
        );
      }
      settingsToUpdate.globalNotificationTimes =
        processedGlobalNotificationTimes;
    }
    const updatedSettings = await EmployerSetting.findOneAndUpdate(
      { employerId: employerId },
      { $set: settingsToUpdate },
      {
        new: true,
        upsert: true,
        runValidators: true,
        setDefaultsOnInsert: true,
      },
    );
    // Reschedule or cancel notifications if needed
    if (updatedSettings.globalNotificationTimes && updatedSettings.timezone) {
      for (const dayOfWeek of DAYS_OF_WEEK_LOWERCASE) {
        const newScheduledTimeUTC =
          updatedSettings.globalNotificationTimes[dayOfWeek];
        if (newScheduledTimeUTC instanceof Date) {
          const notificationsToReschedule = await ScheduledNotification.find({
            employerId: employerId,
            status: "pending",
            referenceDayOfWeek: dayOfWeek,
          });
          for (const notification of notificationsToReschedule) {
            if (
              !notification.scheduledTimeUTC ||
              notification.scheduledTimeUTC.getTime() !==
                newScheduledTimeUTC.getTime()
            ) {
              notification.scheduledTimeUTC = newScheduledTimeUTC;
              notification.attempts = 0;
              await notification.save();
            }
          }
        } else if (newScheduledTimeUTC === null) {
          await ScheduledNotification.updateMany(
            {
              employerId: employerId,
              status: "pending",
              referenceDayOfWeek: dayOfWeek,
            },
            { $set: { status: "cancelled_by_settings" } },
          );
        }
      }
    }
    res.json(updatedSettings);
  } catch (error) {
    if (typeof next === "function") {
      next(error);
    } else {
      res.status(500).json({ message: getErrorMessage(error) });
    }
  }
};

const settingsControllerFactory = (deps) => ({
  getEmployerSettings: (req, res) => getEmployerSettings(req, res),
  updateEmployerSettings: (req, res, next) =>
    updateEmployerSettings(req, res, next),
  // Add other controller methods as needed
});
export default settingsControllerFactory;
