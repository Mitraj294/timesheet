// /home/digilab/timesheet/server/controllers/settingsController.js
import mongoose from 'mongoose';
import EmployerSetting from '../models/EmployerSetting.js';
import ScheduledNotification from '../models/ScheduledNotification.js'; // For rescheduling
import moment from 'moment-timezone'; // For date/time manipulation

const DAYS_OF_WEEK_LOWERCASE = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];


const getErrorMessage = (error) => {
  if (error.errors) { // Mongoose validation error
    return Object.values(error.errors).map(e => e.message).join(', ');
  }
  return error.message || 'An unexpected server error occurred';
};

// Helper function to calculate the next scheduled UTC date
const calculateNextScheduledUTC = (dayOfWeekStr, localTimeHHMM, timezoneStr) => {
  if (!localTimeHHMM || typeof localTimeHHMM !== 'string' || !localTimeHHMM.includes(':')) { // Basic validation for HH:MM format
    return null; // No time set, so no scheduled date
  }

  const [hours, minutes] = localTimeHHMM.split(':').map(Number);
  const nowInEmployerTZ = moment.tz(timezoneStr);

  const dayMapping = {
    sunday: 0, monday: 1, tuesday: 2, wednesday: 3,
    thursday: 4, friday: 5, saturday: 6,
  };
  const targetDayNumber = dayMapping[dayOfWeekStr.toLowerCase()];

  if (typeof targetDayNumber !== 'number') {
    console.error(`[calculateNextScheduledUTC] Invalid dayOfWeekStr: ${dayOfWeekStr}`);
    return null;
  }

  let scheduledMomentInEmployerTZ = nowInEmployerTZ.clone().day(targetDayNumber).hour(hours).minute(minutes).second(0).millisecond(0);

  if (scheduledMomentInEmployerTZ.isBefore(nowInEmployerTZ)) {
    scheduledMomentInEmployerTZ.add(1, 'week');
  }
  return scheduledMomentInEmployerTZ.utc().toDate();
};

// @desc    Get settings for the logged-in employer or the employer of the logged-in employee
// @route   GET /api/settings/employer
// @access  Private
export const getEmployerSettings = async (req, res) => {
  if (!req.user) {
    return res.status(401).json({ message: 'Not authorized, no token' });
  }

  let targetEmployerId;

  if (req.user.role === 'employer') {
    targetEmployerId = req.user.id;
  } else if (req.user.role === 'employee') {
    targetEmployerId = req.user.employerId;
    if (!targetEmployerId) {
      console.error(`[settingsController] Employer ID not found for employee ${req.user.id}.`);
      return res.status(400).json({ message: 'Employer ID not found for this employee.' });
    }
  } else {
    return res.status(403).json({ message: 'User role not permitted to access settings.' });
  }

  try {
    let settings = await EmployerSetting.findOne({ employerId: targetEmployerId });

    if (!settings) {
      console.log(`[settingsController] No settings found for employer ${targetEmployerId}. Creating and returning defaults.`);
      const defaultSettings = {
        employerId: targetEmployerId,
        // showVehiclesTabInSidebar is intentionally omitted, will be undefined by default
        tabletViewRecordingType: 'Automatically Record',
        tabletViewPasswordRequired: false,
        timesheetStartDayOfWeek: 'Monday',
        timesheetIsLunchBreakDefault: true,
        timesheetHideWage: false, // Default for new settings documents
        timesheetAllowOldEdits: false,
        timesheetStartDate: null,
        isTravelChargeByDefault: true,
        is24Hour: false,
        isProjectClient: false,
        isNoteNeeded: false,
        isWorkPerformed: false,
        reassignTimesheet: true,
        showXero: false,
        showLocation: false, // Default for new settings
        employeeCanCreateProject: false, // Changed default to false as per schema
        defaultTimesheetViewType: 'Weekly',
        globalNotificationTimes: { // Default global notification times (client sends HH:MM, server converts to Date)
            monday: '', tuesday: '', wednesday: '', thursday: '',
            friday: '', saturday: '', sunday: ''
        },
        actionNotificationEmail: '',
        timezone: process.env.SERVER_TIMEZONE || 'UTC',
        reportColumns: [],
        weeklyReportEmail: '',
      };
      defaultSettings.timesheetIsProjectClientRequired = false;
      defaultSettings.timesheetAreNotesRequired = false;
      settings = new EmployerSetting(defaultSettings);
      await settings.save();
      return res.json(settings);
    }

    let needsSave = false;
    const employerTimezoneForRollover = settings.timezone || 'UTC';
    for (const day of DAYS_OF_WEEK_LOWERCASE) {
      const storedUtcDate = settings.globalNotificationTimes?.[day]; // Use optional chaining
      if (storedUtcDate instanceof Date) { // Check if it's a valid Date
        const nowInEmployerTZ = moment.tz(employerTimezoneForRollover);
        const scheduledMomentInEmployerTZ = moment.tz(storedUtcDate, employerTimezoneForRollover);

        if (scheduledMomentInEmployerTZ.isBefore(nowInEmployerTZ)) {
          const timeHHMM = scheduledMomentInEmployerTZ.format('HH:mm');
          const nextOccurrenceUTC = calculateNextScheduledUTC(day, timeHHMM, employerTimezoneForRollover);
          settings.globalNotificationTimes[day] = nextOccurrenceUTC;
          needsSave = true;
          console.log(`[settingsController] Rolled over past date for ${day} for employer ${targetEmployerId} to ${nextOccurrenceUTC}`);
        }
      }
    }

    if (needsSave) {
      await settings.save();
      console.log(`[settingsController] Saved settings for employer ${targetEmployerId} after auto-rollover.`);
    }
    console.log(`[settingsController] Settings found for employer ${targetEmployerId}. Returning (potentially rolled-over) settings.`);
    res.json(settings);

  } catch (error) {
    console.error('[settingsController] Error fetching employer settings:', error);
    res.status(500).json({ message: getErrorMessage(error) });
  }
};

// @desc    Update settings for the logged-in employer and reschedule notifications
// @route   PUT /api/settings/employer
// @access  Private (Employer Only)
export const updateEmployerSettings = async (req, res, next) => {
  if (!req.user || req.user.role !== 'employer') {
    return res.status(403).json({ message: 'Access denied.' });
  }

  try {
    const employerId = req.user.id;
    const settingsToUpdate = req.body;
    const clientGlobalNotificationTimes = settingsToUpdate.globalNotificationTimes;

    let currentSettings = await EmployerSetting.findOne({ employerId });
    if (!currentSettings) {
        currentSettings = new EmployerSetting({ employerId, timezone: process.env.SERVER_TIMEZONE || 'UTC' });
    }
    
    const employerTimezoneForUpdate = settingsToUpdate.timezone || currentSettings.timezone || 'UTC';

    const processedGlobalNotificationTimes = {};
    if (clientGlobalNotificationTimes) {
      for (const day of DAYS_OF_WEEK_LOWERCASE) {
        const localTimeHHMM = clientGlobalNotificationTimes[day];
        processedGlobalNotificationTimes[day] = calculateNextScheduledUTC(day, localTimeHHMM, employerTimezoneForUpdate);
      }
      
      settingsToUpdate.globalNotificationTimes = processedGlobalNotificationTimes;
    }

    const updatedSettings = await EmployerSetting.findOneAndUpdate(
      { employerId: employerId },
      { $set: settingsToUpdate },
      { new: true, upsert: true, runValidators: true, setDefaultsOnInsert: true }
    );

    console.log(`[settingsController] Settings updated for employer ${employerId}.`);

    if (updatedSettings.globalNotificationTimes && updatedSettings.timezone) {
      console.log(`[SettingsUpdate] Employer ${employerId} updated global notification times. Initiating reschedule check for pending notifications linked to daily schedules.`);

      for (const dayOfWeek of DAYS_OF_WEEK_LOWERCASE) {
        const newScheduledTimeUTCFromSettings = updatedSettings.globalNotificationTimes[dayOfWeek];

        if (newScheduledTimeUTCFromSettings instanceof Date) {
          const notificationsToReschedule = await ScheduledNotification.find({
            employerId: employerId,
            status: 'pending',
            referenceDayOfWeek: dayOfWeek,
          });

          for (const notification of notificationsToReschedule) {
            if (!notification.scheduledTimeUTC || notification.scheduledTimeUTC.getTime() !== newScheduledTimeUTCFromSettings.getTime()) {
              notification.scheduledTimeUTC = newScheduledTimeUTCFromSettings;
              notification.attempts = 0; // Reset attempts on reschedule
              await notification.save();
              console.log(`[SettingsUpdate] Rescheduled notification ${notification._id} for ${dayOfWeek} to ${newScheduledTimeUTCFromSettings.toISOString()}`);
            }
          }
        } else {
          if (newScheduledTimeUTCFromSettings === null) { 
            console.log(`[SettingsUpdate] Global time for ${dayOfWeek} for employer ${employerId} is now immediate/disabled. Updating pending notifications linked to this day.`);
            await ScheduledNotification.updateMany(
              { 
                employerId: employerId, 
                status: 'pending', 
                referenceDayOfWeek: dayOfWeek 
              },
              { $set: { status: 'cancelled_by_settings' } }
            );
            console.log(`[SettingsUpdate] Marked pending notifications for ${dayOfWeek} (employer ${employerId}) as 'cancelled_by_settings'.`);
          }
        }
      }
    }

    res.json(updatedSettings);

  } catch (error) {
    console.error('[settingsController] Error updating employer settings:', error);
    if (typeof next === 'function') {
        next(error);
    } else {
        res.status(500).json({ message: getErrorMessage(error) });
    }
  }
};
