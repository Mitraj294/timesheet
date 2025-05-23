import Timesheet from "../models/Timesheet.js";
import ExcelJS from 'exceljs';
import mongoose from "mongoose";
import moment from "moment-timezone"; // Keep for report formatting consistency for now
import nodemailer from "nodemailer";
import Employee from "../models/Employee.js"; // Import Employee model
import Project from "../models/Project.js";
import EmployerSetting from "../models/EmployerSetting.js"; // Import EmployerSetting model
import User from "../models/User.js"; // Import User model to get employer details if needed
import ScheduledNotification from '../models/ScheduledNotification.js'; // Import new model
import dotenv from "dotenv";
dotenv.config();

// calculateTotalHours function remains the same
const calculateTotalHours = (startTime, endTime, lunchBreak, lunchDuration) => {
  if (!(startTime instanceof Date) || !(endTime instanceof Date) || isNaN(startTime.getTime()) || isNaN(endTime.getTime())) {
      return 0;
  }
  const start = moment.utc(startTime);
  const end = moment.utc(endTime);

  if (!start.isValid() || !end.isValid() || end.isSameOrBefore(start)) {
      return 0;
  }

  let totalMinutes = end.diff(start, "minutes");

  if (lunchBreak === "Yes" && lunchDuration && /^\d{2}:\d{2}$/.test(lunchDuration) && totalMinutes > 0) {
    const [h, m] = lunchDuration.split(":").map(Number);
    const lunchMinutes = h * 60 + m;
    if (lunchMinutes > 0) {
      // Only deduct lunch if the actual work duration is greater than the lunch duration
      if (totalMinutes > lunchMinutes) {
        totalMinutes -= lunchMinutes;
      } else {
        // If work duration is less than or equal to lunch, implies no work time, or lunch wasn't effectively taken from this short period.
        // In this case, totalMinutes remains the short work duration.
        // If policy dictates it should be 0, then this 'else' isn't needed and Math.max will handle it.
      }
    }
  }
  const finalTotalMinutes = Math.max(0, totalMinutes);
  const totalHours = parseFloat((finalTotalMinutes / 60).toFixed(2));
  return totalHours;
};

// buildTimesheetData function: actualEndTime is removed from here
const buildTimesheetData = (body) => {
  const {
    employeeId, clientId, projectId, // These can be undefined, null, or a string from req.body
    date,
    startTime, endTime,
    lunchBreak, lunchDuration, leaveType, // leaveType can be undefined
    notes, description, hourlyWage,
    timezone
  } = body;

  let userTimezone = 'UTC';
  if (timezone && moment.tz.zone(timezone)) {
      userTimezone = timezone;
  } else {
      console.warn(`[Server Build] Invalid or missing timezone received: '${timezone}'. Falling back to UTC.`);
  }

  // Determine if it's a work day. Handles undefined leaveType as a work day.
  const isWorkDay = !leaveType || leaveType === "None";

  // Core Validations
  if (!employeeId || !mongoose.Types.ObjectId.isValid(employeeId)) {
      throw new Error("Invalid or missing Employee ID");
  }
  if (!date || !moment(date, "YYYY-MM-DD", true).isValid()) {
      throw new Error(`Invalid or missing Date string (YYYY-MM-DD format required): '${date}'`);
  }

  // Validate optional clientId and projectId ONLY if they are provided as non-empty strings
  if (clientId && typeof clientId === 'string' && clientId.trim() !== '' && !mongoose.Types.ObjectId.isValid(clientId)) {
      throw new Error("Invalid Client ID format provided. Must be a valid ObjectId if not empty.");
  }
  if (projectId && typeof projectId === 'string' && projectId.trim() !== '' && !mongoose.Types.ObjectId.isValid(projectId)) {
      throw new Error("Invalid Project ID format provided. Must be a valid ObjectId if not empty.");
  }

  let utcStartTime = null;
  if (isWorkDay && startTime) {
      try {
          utcStartTime = new Date(startTime);
          if (isNaN(utcStartTime.getTime())) {
              throw new Error(`Invalid Start Time format received: ${startTime}`);
          }
      } catch (e) {
           throw new Error(`Error parsing Start Time: ${startTime}`);
      }
  }

  let utcEndTime = null;
  if (isWorkDay && endTime) {
       try {
          utcEndTime = new Date(endTime);
          if (isNaN(utcEndTime.getTime())) {
              throw new Error(`Invalid End Time format received: ${endTime}`);
          }
      } catch (e) {
           throw new Error(`Error parsing End Time: ${endTime}`);
      }
  }
  
  // Calculate isActiveStatus based on startTime and endTime
  const isActiveStatus = (utcStartTime instanceof Date && !isNaN(utcStartTime.getTime()) && (!utcEndTime || isNaN(utcEndTime.getTime())))
                         ? 'Active' : 'Inactive';

  const calculatedTotalHours = isWorkDay && utcStartTime instanceof Date && utcEndTime instanceof Date
    ? calculateTotalHours(utcStartTime, utcEndTime, lunchBreak, lunchDuration)
    : 0;

  const finalData = {
    employeeId,
    clientId: (isWorkDay && clientId && typeof clientId === 'string' && clientId.trim() !== '') ? clientId : null,
    projectId: (isWorkDay && projectId && typeof projectId === 'string' && projectId.trim() !== '') ? projectId : null,
    date: date,
    startTime: utcStartTime,
    endTime: utcEndTime,
    lunchBreak: isWorkDay ? (lunchBreak || 'No') : "No",
    lunchDuration: isWorkDay && (lunchBreak === 'Yes') ? (lunchDuration || "00:30") : "00:00",
    leaveType: leaveType || "None",
    totalHours: calculatedTotalHours,
    notes: isWorkDay ? (notes || "") : "",
    description: !isWorkDay ? (description || "") : "",
    hourlyWage: parseFloat(hourlyWage) || 0,
    timezone: userTimezone,
    // actualEndTime is NOT set here anymore. It's handled in create/update.
    isActiveStatus: isActiveStatus, // Include the calculated status
  };

  if (!isWorkDay) {
      finalData.clientId = null;
      finalData.projectId = null;
      finalData.startTime = null;
      finalData.endTime = null;
      finalData.lunchBreak = "No";
      finalData.lunchDuration = "00:00";
      finalData.notes = "";
      finalData.totalHours = 0;
  }

  return finalData;
};

// --- Helper function for Timesheet Action Notifications ---
const sendImmediateNotificationEmail = async (details) => {
  const { recipientEmail, employeeName, action, timesheetDate, employerName } = details;
  
  if (!recipientEmail) {
    console.warn('[Notification] No recipient email provided for immediate notification.');
    return;
  }
  if (!process.env.EMAIL_USER || !process.env.EMAIL_PASS) {
    console.error('[Notification] Email credentials (EMAIL_USER, EMAIL_PASS) are not configured in .env. Cannot send email.');
    return;
  }

  const transporter = nodemailer.createTransport({
    host: process.env.EMAIL_HOST, // Use configured host
    port: parseInt(process.env.EMAIL_PORT || '587', 10),
    secure: parseInt(process.env.EMAIL_PORT || '587', 10) === 465, // true for 465, false for other ports
    auth: { user: process.env.EMAIL_USER, pass: process.env.EMAIL_PASS },
  });

  const mailOptions = {
    from: `"Timesheet App" <${process.env.EMAIL_USER}>`,
    to: recipientEmail,
    subject: `Timesheet ${action} by ${employeeName}`,
    text: `Hello ${employerName || 'Employer'},\n\nA timesheet for employee ${employeeName} on ${moment(timesheetDate).format('MMM DD, YYYY')} was ${action.toLowerCase()}.\n\nThank you,\nTimesheet App`,
    // html: `<p>Hello ${employerName || 'Employer'},</p><p>A timesheet for employee <strong>${employeeName}</strong> on <strong>${moment(timesheetDate).format('MMM DD, YYYY')}</strong> was <strong>${action}</strong>.</p><p>Thank you,<br/>Timesheet App</p>`
  };

  try {
    await transporter.sendMail(mailOptions);
    console.log(`[Notification] Immediate notification email sent to ${recipientEmail} for ${employeeName}'s timesheet ${action}.`);
  } catch (error) {
    console.error(`[Notification] Failed to send immediate email to ${recipientEmail}:`, error);
  }
};

const handleTimesheetActionNotification = async (timesheet, action, employerIdForTimesheet) => {
  try {
    if (!timesheet || !timesheet.employeeId) return;

    // Fetch the employee to check their notification preference and get their employerId
    const employee = await Employee.findById(timesheet.employeeId)
                                   .select('name email receivesActionNotifications employerId')
                                   .lean(); 

    // If employee not found or has notifications disabled (receivesActionNotifications is explicitly false)
    if (!employee || employee.receivesActionNotifications === false) { 
      console.log(`[Notification] Notifications disabled for employee ${employee?.name || timesheet.employeeId} or employee not found. Skipping.`);
      return;
    }

    // Use employerIdForTimesheet if provided (e.g., from populated employee during update), otherwise use employee.employerId
    const employerIdToUse = employerIdForTimesheet || employee.employerId;
    if (!employerIdToUse) {
        console.warn(`[Notification] Could not determine employer ID for employee ${employee.name}. Skipping notification.`);
        return;
    }

    const employerSettings = await EmployerSetting.findOne({ employerId: employerIdToUse })
                                  .select('globalNotificationTimes actionNotificationEmail timezone') // Include timezone
                                  .populate('employerId', 'name') // Populate employer user to get name
                                  .lean();
    const employerUser = await User.findById(employerIdToUse).select('name').lean(); // Get employer name for email

    if (!employerSettings || !employerSettings.actionNotificationEmail) {
      console.log(`[Notification] Action notification email not configured for employer ${employerIdToUse}. Skipping.`);
      return;
    }

    const dayOfWeek = moment(timesheet.date).format('dddd').toLowerCase(); // e.g., 'monday'
    const notificationTimeForDay = employerSettings.globalNotificationTimes?.[dayOfWeek];

    if (!notificationTimeForDay || notificationTimeForDay === '') { // If time is blank, send immediately
      const notificationDetails = {
        recipientEmail: employerSettings.actionNotificationEmail,
        employeeName: employee.name,
        action: action,
        timesheetDate: moment(timesheet.date).format('YYYY-MM-DD'),
        employerName: employerUser?.name
      };
      await sendImmediateNotificationEmail(notificationDetails);
    } else {
      // --- Schedule the notification ---
      const employerTimezone = employerSettings.timezone || process.env.SERVER_TIMEZONE || 'UTC';
      const [hours, minutes] = notificationTimeForDay.split(':').map(Number);

      // Create the scheduled time in the employer's timezone for the date of the timesheet
      let scheduledMoment = moment.tz(timesheet.date, employerTimezone)
                                 .hours(hours)
                                 .minutes(minutes)
                                 .seconds(0)
                                 .milliseconds(0);

      // If the calculated scheduled time is in the past (e.g., timesheet created late in the day after scheduled time),
      // schedule it for the next available slot (e.g., same time next day if it's a recurring daily thing, or handle as per policy)
      // For now, if it's in the past for today, it might get picked up almost immediately by the cron if the cron runs frequently.
      // Or, more robustly, schedule for the *next* occurrence of that time if it's already passed for the timesheet's date.
      // For simplicity here, we'll schedule it for the specified time on the timesheet's date.
      // The cron job will pick up anything due.

      const scheduledTimeUTC = scheduledMoment.utc().toDate();

      const emailSubject = `Timesheet ${action} by ${employee.name}`;
      const emailMessageBody = `Hello ${employerUser?.name || 'Employer'},\n\nA timesheet for employee ${employee.name} on ${moment(timesheet.date).format('MMM DD, YYYY')} was ${action.toLowerCase()}.\n\nThank you,\nTimesheet App`;

      await ScheduledNotification.create({
        employerId: employerIdToUse,
        recipientEmail: employerSettings.actionNotificationEmail,
        subject: emailSubject,
        messageBody: emailMessageBody,
        scheduledTimeUTC: scheduledTimeUTC,
        status: 'pending',
        // Store some context if needed for more complex summary emails later
        // context: {
        //   employeeName: employee.name,
        //   timesheetAction: action,
        //   timesheetDate: moment(timesheet.date).format('YYYY-MM-DD'),
        // }
      });
      console.log(`[Notification] Queued: Action for ${employee.name} on ${dayOfWeek}. To be sent at ${scheduledMoment.format()} (${employerTimezone}) to ${employerSettings.actionNotificationEmail}.`);
    }
  } catch (error) {
    console.error('[Notification] Error in handleTimesheetActionNotification:', error);
    // Important: Don't let notification errors break the main timesheet operation
  }
};

// @desc    Create a new timesheet entry
// @route   POST /api/timesheets
// @access  Private (e.g., Employee, Employer)
export const createTimesheet = async (req, res) => {
  try {
    const employeeCreatingTimesheet = await Employee.findById(req.body.employeeId);
    if (!employeeCreatingTimesheet || !employeeCreatingTimesheet.employerId) {
      return res.status(400).json({ message: "Cannot determine employer for settings." });
    }
    const settings = await EmployerSetting.findOne({ employerId: employeeCreatingTimesheet.employerId });

    const timesheetDataFromBuild = buildTimesheetData(req.body);

    const isLeaveEntry = timesheetDataFromBuild.leaveType && timesheetDataFromBuild.leaveType !== "None";
    if (settings && !isLeaveEntry) {
      if (settings.timesheetIsProjectClientRequired && !timesheetDataFromBuild.clientId) {
        return res.status(400).json({ message: "Client is required based on employer settings." });
      }
      if (settings.timesheetIsProjectClientRequired && timesheetDataFromBuild.clientId && !timesheetDataFromBuild.projectId) {
        return res.status(400).json({ message: "Project is required." });
      }
      if (settings.timesheetAreNotesRequired && (!timesheetDataFromBuild.notes || timesheetDataFromBuild.notes.trim() === "")) {
        return res.status(400).json({ message: "Work Notes are required based on employer settings." });
      }
    }

    let actualEndTimeForNewEntry = null;
    if (timesheetDataFromBuild.endTime instanceof Date && !isNaN(timesheetDataFromBuild.endTime.getTime())) {
        actualEndTimeForNewEntry = new Date(); // Set actualEndTime if endTime is valid
    }

    const newTimesheet = new Timesheet({
        ...timesheetDataFromBuild,
        actualEndTime: actualEndTimeForNewEntry, // Add actualEndTime here
        isActiveStatus: timesheetDataFromBuild.isActiveStatus, // Ensure status from build is used
    });
    const saved = await newTimesheet.save();

    // Send notification after successful save
    await handleTimesheetActionNotification(saved, 'created', employeeCreatingTimesheet.employerId);

    res.status(201).json({ message: "Timesheet created successfully", data: saved });
  } catch (error) {
     if (error.code === 11000) {
         const field = Object.keys(error.keyValue)[0];
         return res.status(409).json({ message: `A timesheet for this employee on the specified date already exists (Duplicate key error on field: ${field}).` });
     }
    console.error("[Server Create] Error creating timesheet:", error);
    res.status(400).json({ message: error.message || "Error creating timesheet" });
  }
};

// @desc    Check if a timesheet exists for a given employee and date
// @route   GET /api/timesheets/check
// @access  Private (e.g., Employee, Employer)
export const checkTimesheet = async (req, res) => {
  const { employee, date } = req.query;
  if (!employee || !date) return res.status(400).json({ message: 'Missing employee or date parameters' });
  if (!mongoose.Types.ObjectId.isValid(employee)) return res.status(400).json({ message: 'Invalid employee ID format' });
  if (!moment(date, "YYYY-MM-DD", true).isValid()) {
      return res.status(400).json({ message: `Invalid date format (YYYY-MM-DD required): ${date}` });
  }

  try {
    const existing = await Timesheet.findOne({
      employeeId: employee,
      date: date,
    }).lean();
    return res.json({ exists: !!existing, timesheet: existing || null });
  } catch (err) {
    console.error('[Server Check] Error checking timesheet:', err);
    res.status(500).json({ message: 'Server error during timesheet check' });
  }
};


// @desc    Get timesheets based on filters (employeeIds, projectId, startDate, endDate)
// @route   GET /api/timesheets
// @access  Private (e.g., Employee, Employer)
export const getTimesheets = async (req, res) => {
  try {
    const { employeeIds = [], projectId, startDate, endDate } = req.query;
    const filter = {};

    if (projectId && mongoose.Types.ObjectId.isValid(projectId)) {
        filter.projectId = projectId;
    } else if (projectId) {
        console.log("[Server Get] Invalid project ID provided, ignoring project filter.");
    }

    if (!filter.projectId && Array.isArray(employeeIds) && employeeIds.length > 0) {
      const validIds = employeeIds.filter(id => mongoose.Types.ObjectId.isValid(id));
      if (validIds.length > 0) {
          filter.employeeId = { $in: validIds };
      } else {
          console.log("[Server Get] No valid employee IDs provided in filter, returning empty.");
          return res.json({ timesheets: [], totalHours: 0, avgHours: 0 });
      }
    } else if (!filter.projectId && typeof employeeIds === 'string' && employeeIds) {
        if (mongoose.Types.ObjectId.isValid(employeeIds)) {
            filter.employeeId = employeeIds;
        } else {
            console.log("[Server Get] Invalid single employee ID provided, returning empty.");
            return res.json({ timesheets: [], totalHours: 0, avgHours: 0 });
        }
    }

    if (startDate && moment(startDate, 'YYYY-MM-DD', true).isValid()) {
        filter.date = filter.date || {};
        filter.date.$gte = startDate;
    }
    if (endDate && moment(endDate, 'YYYY-MM-DD', true).isValid()) {
        filter.date = filter.date || {};
        filter.date.$lte = endDate;
    }

    const timesheetsFromDb = await Timesheet.find(filter)
      .populate("employeeId", "name email wage status expectedWeeklyHours")
      .populate("clientId", "name emailAddress")
      .populate("projectId", "name startDate finishDate")
      .sort({ date: 1, startTime: 1 })
      .lean();

    const formattedTimesheets = timesheetsFromDb.map(ts => {
        let formattedDate = ts.date;
        if (formattedDate && !/^\d{4}-\d{2}-\d{2}$/.test(formattedDate)) {
            try {
                const parsedMoment = moment.utc(formattedDate);
                if (parsedMoment.isValid()) {
                    formattedDate = parsedMoment.format('YYYY-MM-DD');
                } else {
                    console.warn(`[Server Get] Could not re-format date for timesheet ${ts._id}: ${ts.date}`);
                    formattedDate = "INVALID_DATE";
                }
            } catch (e) {
                console.warn(`[Server Get] Error re-formatting date for timesheet ${ts._id}: ${ts.date}`, e);
                formattedDate = "INVALID_DATE";
            }
        }
        return { ...ts, date: formattedDate };
    });

    const total = formattedTimesheets.reduce((sum, t) => sum + (t.totalHours || 0), 0);
    const avg = formattedTimesheets.length > 0 ? parseFloat((total / formattedTimesheets.length).toFixed(2)) : 0;

    res.json({
      timesheets: formattedTimesheets,
      totalHours: parseFloat(total.toFixed(2)),
      avgHours: avg,
    });
  } catch (error) {
    console.error("[Server Get] Error fetching timesheets:", error.message);
    res.status(500).json({ message: `Failed to fetch timesheets: ${error.message}` });
  }
};

// @desc    Get a single timesheet by its ID
// @route   GET /api/timesheets/:id
// @access  Private (e.g., Employee, Employer)
export const getTimesheetById = async (req, res) => {
  try {
    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ message: "Invalid Timesheet ID format" });
    }

    const timesheet = await Timesheet.findById(id)
      .populate("employeeId", "name email wage status expectedWeeklyHours")
      .populate("clientId", "name emailAddress")
      .populate("projectId", "name startDate finishDate")
      .lean();

    if (!timesheet) {
      return res.status(404).json({ message: "Timesheet not found" });
    }
    res.json(timesheet);
  } catch (error) {
    console.error("[Server GetById] Error fetching timesheet:", error);
    res.status(500).json({ message: `Error fetching timesheet: ${error.message}` });
  }
};

// @desc    Update a timesheet entry
// @route   PUT /api/timesheets/:id
// @access  Private
export const updateTimesheet = async (req, res) => {
  try {
    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
        return res.status(400).json({ message: "Invalid Timesheet ID format" });
    }
    
    const timesheet = await Timesheet.findById(id);
    if (!timesheet) {
      return res.status(404).json({ message: "Timesheet not found" });
    }
    // Store the original endTime from the database for comparison
    const originalDbEndTime = timesheet.endTime ? new Date(timesheet.endTime.getTime()) : null;

    const originalEmployeeIdString = timesheet.employeeId.toString();
    await timesheet.populate('employeeId', 'employerId userId'); 

    if (!timesheet.employeeId || !timesheet.employeeId.employerId) {
      return res.status(400).json({ message: "Cannot determine employer for settings for this timesheet." });
    }
    
    const employerIdForSettings = timesheet.employeeId.employerId;
    const settings = await EmployerSetting.findOne({ employerId: employerIdForSettings });
    if (!settings) {
      console.warn(`[Server Update] Settings not found for employer ${employerIdForSettings}. Proceeding without settings-based validation.`);
    }

    if (req.user.role === 'employee') {
      if (!timesheet.employeeId.userId || timesheet.employeeId.userId.toString() !== req.user.id.toString()) {
          return res.status(403).json({ message: "Forbidden: You can only update your own timesheets." });
      }
      if (settings && settings.timesheetAllowOldEdits === false) {
        const timesheetDate = moment.utc(timesheet.date, 'YYYY-MM-DD');
        if (moment.utc().diff(timesheetDate, 'days') > 15) {
          return res.status(403).json({ message: "Forbidden: Editing of timesheets older than 15 days is not allowed." });
        }
      }
    } else if (req.user.role === 'employer') {
      if (timesheet.employeeId.employerId.toString() !== req.user.id.toString()) {
        return res.status(403).json({ message: "Forbidden: You can only update timesheets for your own employees." });
      }
    }

    const dataForBuild = {
      ...timesheet.toObject(),
      ...req.body,
      employeeId: originalEmployeeIdString
    };
    const validatedData = buildTimesheetData(dataForBuild); // Renamed from potentialUpdateData

    const isLeaveEntry = validatedData.leaveType && validatedData.leaveType !== "None";
    if (settings && !isLeaveEntry) {
      if (settings.timesheetIsProjectClientRequired && !validatedData.clientId) {
        return res.status(400).json({ message: "Client is required based on employer settings." });
      }
      if (settings.timesheetIsProjectClientRequired && validatedData.clientId && !validatedData.projectId) {
        return res.status(400).json({ message: "Project is required." });
      }
      if (settings.timesheetAreNotesRequired && (!validatedData.notes || validatedData.notes.trim() === "")) {
        return res.status(400).json({ message: "Work Notes are required based on employer settings." });
      }
    }

    // Apply validated data
    if (req.body.date !== undefined) timesheet.date = validatedData.date;
    if (req.body.startTime !== undefined) timesheet.startTime = validatedData.startTime;
    
    // Handle endTime and actualEndTime logic
    if (req.body.hasOwnProperty('endTime')) {
        const newValidatedEndTime = validatedData.endTime;

        const newEndTimeMs = newValidatedEndTime ? newValidatedEndTime.getTime() : null;
        const originalDbEndTimeMs = originalDbEndTime ? originalDbEndTime.getTime() : null;

        if (newEndTimeMs !== originalDbEndTimeMs) { // If the effective endTime value has changed
            timesheet.endTime = newValidatedEndTime;
            if (newValidatedEndTime) {
                timesheet.actualEndTime = new Date(); // Set/update actualEndTime
            } else {
                timesheet.actualEndTime = null; // Clear actualEndTime if endTime is cleared
            }
        }
        // If endTime was in req.body but its value didn't change, actualEndTime is NOT updated.
    }
    // If 'endTime' is not in req.body, timesheet.endTime and timesheet.actualEndTime are not touched.

    if (req.body.lunchBreak !== undefined) timesheet.lunchBreak = validatedData.lunchBreak;
    if (req.body.lunchDuration !== undefined) timesheet.lunchDuration = validatedData.lunchDuration;
    if (req.body.notes !== undefined) timesheet.notes = validatedData.notes;
    if (req.body.clientId !== undefined) timesheet.clientId = validatedData.clientId;
    if (req.body.projectId !== undefined) timesheet.projectId = validatedData.projectId;
    if (req.body.leaveType !== undefined) timesheet.leaveType = validatedData.leaveType;
    if (req.body.description !== undefined) timesheet.description = validatedData.description;
    if (req.body.hourlyWage !== undefined) timesheet.hourlyWage = validatedData.hourlyWage;
    if (req.body.timezone !== undefined) timesheet.timezone = validatedData.timezone;

    if (timesheet.startTime && timesheet.endTime) {
        timesheet.isActiveStatus = 'Inactive'; // Set status based on end time presence
        timesheet.totalHours = calculateTotalHours(
            timesheet.startTime,
            timesheet.endTime,
            timesheet.lunchBreak,
            timesheet.lunchDuration
        );
    } else if (timesheet.leaveType && timesheet.leaveType !== "None") {
        timesheet.isActiveStatus = 'Inactive'; // Leave entries are not "Active" work entries
        timesheet.totalHours = 0; 
    } else {
        // If startTime exists but endTime is null, it's Active. Otherwise, Inactive.
        timesheet.isActiveStatus = (timesheet.startTime && !timesheet.endTime) ? 'Active' : 'Inactive';
        timesheet.totalHours = 0;
    }

    const savedTimesheet = await timesheet.save();

    // Send notification after successful update
    await handleTimesheetActionNotification(savedTimesheet, 'updated', employerIdForSettings);

    res.json({ message: "Timesheet updated successfully", timesheet: savedTimesheet });
  } catch (error) {
     if (error.code === 11000) {
         const field = Object.keys(error.keyValue)[0];
         return res.status(409).json({ message: `Updating caused a conflict with another entry (Duplicate key error on field: ${field}).` });
     }
    console.error("[Server Update] Error updating timesheet:", error);
    res.status(400).json({ message: error.message || "Error updating timesheet" });
  }
};

// @desc    Get all incomplete timesheets for a specific employee (startTime exists, endTime is null)
// @route   GET /api/timesheets/employee/:employeeId/incomplete
// @access  Private (Employee, Employer)
export const getIncompleteTimesheetsByEmployee = async (req, res) => {
    try {
        const { employeeId } = req.params;
        if (!mongoose.Types.ObjectId.isValid(employeeId)) return res.status(400).json({ message: "Invalid Employee ID" });

        const incompleteTimesheets = await Timesheet.find({
            employeeId: employeeId,
            isActiveStatus: 'Active', // Filter by the new stored status field
            endTime: null
        })
        .sort({ date: 1, startTime: 1 })
        .lean();
        res.json(incompleteTimesheets);
    } catch (error) {
        console.error("[Server GetIncompleteByEmployee] Error:", error);
        res.status(500).json({ message: `Error fetching incomplete timesheets: ${error.message}` });
    }
};

// @desc    Get all timesheets for a specific project
// @route   GET /api/timesheets/project/:projectId
// @access  Private (e.g., Employee, Employer)
export const getTimesheetsByProject = async (req, res) => {
    try {
        const { projectId } = req.params;
        if (!mongoose.Types.ObjectId.isValid(projectId)) return res.status(400).json({ message: "Invalid Project ID" });
        const timesheets = await Timesheet.find({ projectId })
            .populate("employeeId", "name email wage status expectedWeeklyHours")
            .populate("clientId", "name emailAddress")
            .populate("projectId", "name startDate finishDate")
            .sort({ date: 1, startTime: 1 })
            .lean();
        res.json(timesheets);
    } catch (error) {
        console.error("[Server GetByProject] Error:", error);
        res.status(500).json({ message: `Error fetching timesheets by project: ${error.message}` });
    }
};

// @desc    Get all timesheets for a specific employee
// @route   GET /api/timesheets/employee/:employeeId
// @access  Private (e.g., Employee, Employer)
export const getTimesheetsByEmployee = async (req, res) => {
     try {
        const { employeeId } = req.params;
        if (!mongoose.Types.ObjectId.isValid(employeeId)) return res.status(400).json({ message: "Invalid Employee ID" });
        const timesheets = await Timesheet.find({ employeeId })
            .populate("employeeId", "name email wage status expectedWeeklyHours")
            .populate("clientId", "name emailAddress")
            .populate("projectId", "name startDate finishDate")
            .sort({ date: 1, startTime: 1 })
            .lean();
        res.json(timesheets);
    } catch (error) {
        console.error("[Server GetByEmployee] Error:", error);
        res.status(500).json({ message: `Error fetching timesheets by employee: ${error.message}` });
    }
};

// @desc    Get all timesheets for a specific client
// @route   GET /api/timesheets/client/:clientId
// @access  Private (e.g., Employee, Employer)
export const getTimesheetsByClient = async (req, res) => {
     try {
        const { clientId } = req.params;
        if (!mongoose.Types.ObjectId.isValid(clientId)) return res.status(400).json({ message: "Invalid Client ID" });
        const timesheets = await Timesheet.find({ clientId })
            .populate("employeeId", "name email wage status expectedWeeklyHours")
            .populate("clientId", "name emailAddress")
            .populate("projectId", "name startDate finishDate")
            .sort({ date: 1, startTime: 1 })
            .lean();
        res.json(timesheets);
    } catch (error) {
        console.error("[Server GetByClient] Error:", error);
        res.status(500).json({ message: `Error fetching timesheets by client: ${error.message}` });
    }
};



// @desc    Delete a timesheet entry by ID
// @route   DELETE /api/timesheets/:id
// @access  Private (e.g., Employee, Employer)
export const deleteTimesheet = async (req, res) => {
    try {
        const { id } = req.params;
        if (!mongoose.Types.ObjectId.isValid(id)) {
            return res.status(400).json({ message: "Invalid Timesheet ID format" });
        }
        const deletedTimesheet = await Timesheet.findByIdAndDelete(id);
        if (!deletedTimesheet) {
          return res.status(404).json({ message: "Timesheet not found" });
        }
        console.log("[Server Delete] Timesheet deleted successfully:", id);
        res.status(200).json({ message: "Timesheet deleted successfully", id: id });
      } catch (error) {
        console.error("[Server Delete] Error deleting timesheet:", error);
        res.status(500).json({ message: `Error deleting timesheet: ${error.message}` });
      }
 };

// formatDataForReport function remains the same
const formatDataForReport = (timesheets, defaultTimezone = 'UTC') => {
    if (!Array.isArray(timesheets)) return [];
    return timesheets.map(ts => {
        if (!ts) return {};
        const reportTimezone = ts.timezone && moment.tz.zone(ts.timezone) ? ts.timezone : defaultTimezone;

        let localDate = ts.date;
        if (localDate && !/^\d{4}-\d{2}-\d{2}$/.test(localDate)) {
             try {
                const parsedMoment = moment.utc(localDate);
                if (parsedMoment.isValid()) {
                    localDate = parsedMoment.format('YYYY-MM-DD');
                } else { localDate = "Invalid Date"; }
            } catch { localDate = "Invalid Date"; }
        } else if (!localDate) {
            localDate = "Invalid Date";
        }

        const localStartTime = ts.startTime instanceof Date && !isNaN(ts.startTime.getTime())
                             ? moment(ts.startTime).tz(reportTimezone).format("HH:mm") : "";
        const localEndTime = ts.endTime instanceof Date && !isNaN(ts.endTime.getTime())
                           ? moment(ts.endTime).tz(reportTimezone).format("HH:mm") : "";
        const dayOfWeek = moment(localDate, "YYYY-MM-DD", true).isValid()
                        ? moment(localDate, "YYYY-MM-DD").format('dddd') : "";

        return {
            employee: ts.employeeId?.name || 'Unknown',
            date: localDate,
            day: dayOfWeek,
            client: ts.clientId?.name || '',
            project: ts.projectId?.name || '',
            startTime: localStartTime,
            endTime: localEndTime,
            lunchBreak: ts.lunchBreak || 'No',
            lunchDuration: ts.lunchBreak === 'Yes' ? (ts.lunchDuration || '00:00') : '',
            leaveType: ts.leaveType === 'None' ? '' : (ts.leaveType || ''),
            description: ts.description || '',
            notes: ts.notes || '',
            hourlyWage: ts.hourlyWage != null ? `$${parseFloat(ts.hourlyWage).toFixed(2)}` : '',
            totalHours: ts.totalHours != null ? parseFloat(ts.totalHours).toFixed(2) : '0.00',
        };
    });
};

// standardReportColumns remains the same
const standardReportColumns = [
      { header: 'Full Name', key: 'employee', width: 25 },
      { header: 'Date', key: 'date', width: 15, style: { numFmt: 'yyyy-mm-dd' } },
      { header: 'Day', key: 'day', width: 12 },
      { header: 'Client', key: 'client', width: 25 },
      { header: 'Project', key: 'project', width: 25 },
      { header: 'Start', key: 'startTime', width: 10 },
      { header: 'End', key: 'endTime', width: 10 },
      { header: 'Lunch', key: 'lunchDuration', width: 10 },
      { header: 'Leave Type', key: 'leaveType', width: 15 },
      { header: 'Description', key: 'description', width: 30 },
      { header: 'Work Notes', key: 'notes', width: 30 },
      { header: 'Wage', key: 'hourlyWage', width: 10, style: { numFmt: '$#,##0.00' } },
      { header: 'Total Hours', key: 'totalHours', width: 12, style: { numFmt: '0.00' } },
];

// handleReportAction function
const handleReportAction = async (req, res, isDownload, groupBy) => {
  const actionType = isDownload ? 'download' : 'send';
  const { email, employeeIds: requestedEmployeeIdsParam = [], projectIds = [], startDate, endDate, timezone = 'UTC' } = req.body;
  const employerId = req.user.id;

  if (!isDownload && (!email || !/\S+@\S+\.\S+/.test(email))) {
      return res.status(400).json({ message: 'Valid recipient email is required for sending.' });
  }
  const reportTimezone = timezone && moment.tz.zone(timezone) ? timezone : 'UTC';
  if (reportTimezone === 'UTC' && timezone !== 'UTC') {
      console.warn(`[Server Report] Invalid report timezone '${timezone}'. Using UTC for formatting times.`);
  }

  try {
    const employerSettings = await EmployerSetting.findOne({ employerId: employerId }).lean();

    let employeesOfEmployer;
    if (requestedEmployeeIdsParam && requestedEmployeeIdsParam.length > 0) {
        const validRequestedIds = requestedEmployeeIdsParam.filter(id => mongoose.Types.ObjectId.isValid(id));
        employeesOfEmployer = await Employee.find({
            _id: { $in: validRequestedIds },
            employerId: employerId
        }).select('_id').lean();
    } else {
        employeesOfEmployer = await Employee.find({ employerId: employerId }).select('_id').lean();
    }

    const finalEmployeeIds = employeesOfEmployer.map(emp => emp._id);

    if (finalEmployeeIds.length === 0) {
        return res.status(404).json({ message: "No employees found for this employer matching the criteria." });
    }
    const employeesData = await Employee.find({ _id: { $in: finalEmployeeIds } })
                                        .select('name wage expectedHours') // Corrected: expectedHours instead of expectedWeeklyHours
                                        .lean();
    const employeeMap = new Map(employeesData.map(emp => [emp._id.toString(), emp]));

    let projectDetailsMap = new Map();
    const filter = {};
    const filterIds = (ids) => ids.filter(id => mongoose.Types.ObjectId.isValid(id));

    filter.employeeId = { $in: finalEmployeeIds };

    if (groupBy === 'employee') {
        // No additional filtering needed beyond employer's employees
    } else if (groupBy === 'project' && Array.isArray(projectIds) && projectIds.length > 0) {
        const validIds = filterIds(projectIds);
        if (validIds.length > 0) filter.projectId = { $in: validIds };
        else return res.status(400).json({ message: 'No valid project IDs provided for project filtering.' });
    }
    if (startDate && moment(startDate, 'YYYY-MM-DD', true).isValid()) {
        filter.date = { ...filter.date, $gte: startDate };
    }
    if (endDate && moment(endDate, 'YYYY-MM-DD', true).isValid()) {
        filter.date = { ...filter.date, $lte: endDate };
    }

    const timesheets = await Timesheet.find(filter)
      .populate('employeeId', 'name')
      .populate('clientId', 'name')
      .populate('projectId', 'name')
      .sort(groupBy === 'project' ? { 'projectId.name': 1, date: 1, startTime: 1 } : { 'employeeId.name': 1, date: 1, startTime: 1 })
      .lean();

    if (!timesheets.length) {
      return res.status(404).json({ message: "No timesheets found matching the specified filters." });
    }

    const workbook = new ExcelJS.Workbook();
    workbook.creator = "Timesheet App";
    const ws = workbook.addWorksheet(groupBy === 'project' ? 'Project Timesheets' : 'Employee Timesheets');

    let activeReportColumns = standardReportColumns;
    if (employerSettings && Array.isArray(employerSettings.reportColumns)) {
      if (employerSettings.reportColumns.length > 0) {
        activeReportColumns = standardReportColumns.filter(col => employerSettings.reportColumns.includes(col.key));
      }
    }
    ws.columns = activeReportColumns;

    if (activeReportColumns.length > 0) {
      ws.getRow(1).font = { bold: true, alignment: { vertical: 'middle', horizontal: 'center' }, fill: { type: 'pattern', pattern:'solid', fgColor:{argb:'FFD3D3D3'} }, border: { bottom: { style: 'thin' } }};
    }

    if (groupBy === 'project') {
        if (projectIds && projectIds.length > 0) {
            const validProjectIds = filterIds(projectIds);
            const projectsFromDb = await Project.find({ _id: { $in: validProjectIds } }).select('name').lean();
            projectsFromDb.forEach(p => projectDetailsMap.set(p._id.toString(), p.name));
        } else {
            timesheets.forEach(ts => {
                if (ts.projectId && !projectDetailsMap.has(ts.projectId._id.toString())) {
                    projectDetailsMap.set(ts.projectId._id.toString(), ts.projectId.name);
                }
            });
        }

        if (projectDetailsMap.size === 0 && activeReportColumns.length > 0) {
             return res.status(404).json({ message: "No projects found for the report criteria." });
        }

        projectDetailsMap.forEach((projectName, currentProjectIdString) => {
            if (activeReportColumns.length > 0) {
                const projectHeaderRow = ws.addRow([projectName]);
                projectHeaderRow.font = { bold: true, size: 14 };
                ws.mergeCells(projectHeaderRow.number, 1, projectHeaderRow.number, activeReportColumns.length);
                projectHeaderRow.getCell(1).alignment = { horizontal: 'center' };
                ws.addRow([]);
            }

            employeesData.forEach(employee => {
                const employeeTimesheetsForProject = timesheets.filter(
                    ts => ts.employeeId._id.toString() === employee._id.toString() &&
                          ts.projectId?._id.toString() === currentProjectIdString
                );

                const formattedEmployeeTimesheets = formatDataForReport(employeeTimesheetsForProject, reportTimezone);
                let employeeProjectTotalHours = 0;
                let employeeProjectTotalIncome = 0;

                if (formattedEmployeeTimesheets.length > 0) {
                    formattedEmployeeTimesheets.forEach((entry, index) => {
                        const rowDataValues = activeReportColumns.map(col => entry[col.key]);
                        if (activeReportColumns.length > 0 && activeReportColumns[0].key === 'employee') {
                            rowDataValues[0] = index === 0 ? employee.name : '';
                        }
                        if (activeReportColumns.length > 0) ws.addRow(rowDataValues);
                        employeeProjectTotalHours += parseFloat(entry.totalHours || 0);
                        employeeProjectTotalIncome += parseFloat(entry.totalHours || 0) * (employee.wage || 0);
                    });
                } else if (activeReportColumns.length > 0) {
                    const emptyRowDataValues = activeReportColumns.map(col => (col.key === 'employee') ? employee.name : '');
                    ws.addRow(emptyRowDataValues);
                }

                if (activeReportColumns.length > 0) {
                    const summaryExpectedValues = activeReportColumns.map(col => {
                        if (col.key === 'leaveType') return 'EXPECTED';
                        if (col.key === 'totalHours') return employee.expectedHours !== undefined ? String(employee.expectedHours) : '0'; // Corrected: expectedHours
                        return '';
                    });
                    ws.addRow(summaryExpectedValues);

                    const summaryOvertimeValues = activeReportColumns.map(col => {
                        if (col.key === 'leaveType') return 'OVERTIME';
                         if (col.key === 'totalHours') {
                            return '0';
                         }
                        return '';
                    });
                    ws.addRow(summaryOvertimeValues);

                    const summaryTotalHoursValues = activeReportColumns.map(col => {
                        if (col.key === 'notes') return 'TOTAL HOURS';
                        if (col.key === 'totalHours') return employeeProjectTotalHours.toFixed(2);
                        return '';
                    });
                     ws.addRow(summaryTotalHoursValues);

                    const summaryTotalIncomeValues = activeReportColumns.map(col => {
                        if (col.key === 'notes') return 'TOTAL INCOME EARNED';
                        if (col.key === 'totalHours') return `$${employeeProjectTotalIncome.toFixed(2)}`;
                        return '';
                    });
                    ws.addRow(summaryTotalIncomeValues);
                    ws.addRow([]);
                }
            });
            if (activeReportColumns.length > 0) ws.addRow([]);
        });

    } else {
        const formattedData = formatDataForReport(timesheets, reportTimezone);
        const groupedData = formattedData.reduce((acc, entry) => {
            const groupKey = entry.employee || `Unknown Employee`;
            (acc[groupKey] = acc[groupKey] || []).push(entry);
            return acc;
        }, {});
        populateWorksheetForEmployeeGrouping(groupedData, ws, activeReportColumns);
    }

    const buffer = await workbook.xlsx.writeBuffer();

    let nameLabel = `${groupBy.charAt(0).toUpperCase() + groupBy.slice(1)}_Report`;
    if (groupBy === 'project' && projectIds && projectIds.length === 1 && projectDetailsMap.has(projectIds[0])) {
        nameLabel = projectDetailsMap.get(projectIds[0]);
    } else if (groupBy === 'employee' && finalEmployeeIds.length === 1 && employeeMap.has(finalEmployeeIds[0].toString())) {
        nameLabel = employeeMap.get(finalEmployeeIds[0].toString()).name;
    }

    const startLabel = startDate ? moment(startDate, 'YYYY-MM-DD').format('YYYYMMDD') : 'Start';
    const endLabel = endDate ? moment(endDate, 'YYYY-MM-DD').format('YYYYMMDD') : 'End';
    const sanitize = (str) => String(str).replace(/[^a-zA-Z0-9_-]/g, '_');
    const fileName = `${sanitize(nameLabel)}_${groupBy}_Timesheet_${sanitize(startLabel)}_to_${sanitize(endLabel)}.xlsx`;

    if (isDownload) {
      res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
      res.setHeader('Content-Disposition', `attachment; filename="${fileName}"; filename*=UTF-8''${encodeURIComponent(fileName)}`);
      return res.send(buffer);
    } else {
      const transporter = nodemailer.createTransport({
        service: "gmail",
        auth: { user: process.env.EMAIL_USER, pass: process.env.EMAIL_PASS },
        connectionTimeout: 10000,
        greetingTimeout: 10000,
        socketTimeout: 10000,
      });

      const mailOptions = {
        from: `"Timesheet App" <${process.env.EMAIL_USER}>`,
        to: email,
        subject: `${groupBy.charAt(0).toUpperCase() + groupBy.slice(1)} Timesheet Report: ${nameLabel} (${startLabel} - ${endLabel})`,
        text: `Please find the attached ${groupBy} timesheet report for ${nameLabel} covering the period from ${startDate || 'start'} to ${endDate || 'end'}.\nReport generated using ${reportTimezone} timezone for time formatting.`,
        attachments: [{ filename: fileName, content: buffer }],
      };

      try {
        await transporter.sendMail(mailOptions);
        return res.status(200).json({ message: "Timesheet email sent successfully!" });
      } catch (mailError) {
        console.error(`[Server Report] Failed to send email to ${email}:`, mailError);
        return res.status(500).json({ message: `Failed to send email. Please check server configuration or contact support. Error: ${mailError.message}` });
      }
    }
  } catch (error) {
    console.error(`[Server Report] Exception during ${actionType} process:`, error);
    return res.status(500).json({ message: `Failed to ${actionType} report: ${error.message}` });

  }
};

// @desc    Download timesheets as Excel, grouped by employee
// @route   POST /api/timesheets/report/download/employee
// @access  Private (e.g., Employer)
export const downloadTimesheets = (req, res) => handleReportAction(req, res, true, 'employee');

// @desc    Send timesheets email with Excel attachment, grouped by employee
// @route   POST /api/timesheets/report/email/employee
// @access  Private (e.g., Employer)
export const sendTimesheetEmail = (req, res) => handleReportAction(req, res, false, 'employee');

// @desc    Download timesheets as Excel, grouped by project
// @route   POST /api/timesheets/report/download/project
// @access  Private (e.g., Employer)
export const downloadProjectTimesheets = (req, res) => handleReportAction(req, res, true, 'project');

// @desc    Send timesheets email with Excel attachment, grouped by project
// @route   POST /api/timesheets/report/email/project
// @access  Private (e.g., Employer)
export const sendProjectTimesheetEmail = (req, res) => handleReportAction(req, res, false, 'project');

// Populates the worksheet for employee-grouped data
const populateWorksheetForEmployeeGrouping = (groupedByEmployeeName, ws, activeColumns) => {
    if (activeColumns.length === 0) return;

    Object.entries(groupedByEmployeeName).forEach(([employeeName, entries]) => {
        entries.forEach((entry, index) => {
            const rowValues = activeColumns.map(col => entry[col.key]);
            if (activeColumns.length > 0 && activeColumns[0].key === 'employee') {
                rowValues[0] = (index === 0) ? employeeName : '';
            }
            ws.addRow(rowValues);
        });
        if (Object.keys(groupedByEmployeeName).length > 1 && entries.length > 0) {
            ws.addRow({});
        }
    });
};

// --- Weekly Report Automation ---

/**
 * Calculates the start and end dates for the previous week based on a given start day.
 * @param {string} startDayOfWeekSetting - The day the week starts on (e.g., "Monday", "Sunday").
 * @returns {{startDate: string, endDate: string}} - The start and end dates in 'YYYY-MM-DD' format.
 */
const getPreviousWeekDateRange = (startDayOfWeekSetting = 'Monday') => {
    const today = moment();
    // Moment's week starts on Sunday (0) by default. Adjust if startDayOfWeekSetting is different.
    // .day() sets the day of the week. If the given day is before the current day in the current week, it moves to the next week.
    // So, we first go to the start of the "current" week according to moment's default (Sunday).
    // Then, we adjust to the *actual* start of the current week based on the setting.

    let startOfCurrentWeek;
    if (moment.localeData().firstDayOfWeek() === moment.weekdays(true).indexOf(startDayOfWeekSetting)) {
        // If moment's default first day of week matches the setting
        startOfCurrentWeek = today.clone().startOf('week');
    } else {
        // Manually find the start of the current week based on the setting
        startOfCurrentWeek = today.clone().day(startDayOfWeekSetting);
        if (startOfCurrentWeek.isAfter(today, 'day')) { // If .day() moved to next week's start day
            startOfCurrentWeek.subtract(1, 'week');
        }
    }

    const startDateOfPreviousWeek = startOfCurrentWeek.clone().subtract(1, 'week');
    const endDateOfPreviousWeek = startDateOfPreviousWeek.clone().endOf('week'); // endOf('week') respects locale's end of week.
                                                                            // If startDay is Monday, endOf('week') is Sunday.

    return {
        startDate: startDateOfPreviousWeek.format('YYYY-MM-DD'),
        endDate: endDateOfPreviousWeek.format('YYYY-MM-DD'),
    };
};

/**
 * @desc    Automated task to send weekly timesheet reports to configured employers.
 *          This function is intended to be called by a scheduler (e.g., node-cron).
 */
export const sendWeeklyTimesheetReports = async () => {
    console.log(`[WeeklyReportTask] Starting job at ${moment().format()}`);
    try {
        const allSettings = await EmployerSetting.find({
            weeklyReportEmail: { $exists: true, $ne: null, $ne: "" }
        }).lean();

        if (!allSettings.length) {
            console.log("[WeeklyReportTask] No employers configured for weekly reports.");
            return;
        }

        for (const settings of allSettings) {
            if (!settings.weeklyReportEmail || !/\S+@\S+\.\S+/.test(settings.weeklyReportEmail)) {
                console.warn(`[WeeklyReportTask] Invalid or missing weeklyReportEmail for employerId ${settings.employerId}. Skipping.`);
                continue;
            }

            console.log(`[WeeklyReportTask] Processing report for employerId: ${settings.employerId}, email: ${settings.weeklyReportEmail}`);

            const { startDate, endDate } = getPreviousWeekDateRange(settings.timesheetStartDayOfWeek);
            const reportTimezone = settings.timezone || 'UTC'; // Assuming employer settings might have a timezone field

            // We need to fetch all employee IDs for this employer to pass to handleReportAction
            const employees = await Employee.find({ employerId: settings.employerId }).select('_id').lean();
            const employeeIds = employees.map(emp => emp._id.toString());

            if (employeeIds.length === 0) {
                console.log(`[WeeklyReportTask] No employees found for employerId ${settings.employerId}. Skipping report.`);
                continue;
            }

            const mockReq = {
                user: { id: settings.employerId.toString() }, // handleReportAction expects employerId here
                body: {
                    email: settings.weeklyReportEmail,
                    employeeIds: employeeIds, // Send all employees for this employer
                    startDate,
                    endDate,
                    timezone: reportTimezone,
                }
            };
            // handleReportAction sends responses, but for a cron job, we just log.
            // We can create a simple mockRes or adapt handleReportAction if it becomes complex.
            // For now, handleReportAction's own logging should suffice for success/failure of email sending.
            await handleReportAction(mockReq, { status: () => ({ json: () => {} }), send: () => {} }, false, 'employee');
            console.log(`[WeeklyReportTask] Attempted to send report for employerId: ${settings.employerId} to ${settings.weeklyReportEmail} for period ${startDate} to ${endDate}`);
        }
        console.log("[WeeklyReportTask] Finished processing all configured employers.");
    } catch (error) {
        console.error("[WeeklyReportTask] Error during weekly report generation:", error);
    }
};
