import Timesheet from "../models/Timesheet.js";
import ExcelJS from 'exceljs';
import mongoose from "mongoose";
import moment from "moment-timezone"; // Keep for report formatting consistency for now
import nodemailer from "nodemailer";
import Employee from "../models/Employee.js"; // Import Employee model
import Project from "../models/Project.js"; // Import Project model
import EmployerSetting from "../models/EmployerSetting.js"; // Import EmployerSetting model
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

// buildTimesheetData function remains the same
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

  const calculatedTotalHours = isWorkDay && utcStartTime instanceof Date && utcEndTime instanceof Date
    ? calculateTotalHours(utcStartTime, utcEndTime, lunchBreak, lunchDuration)
    : 0;

  const finalData = {
    employeeId,
    // If clientId/projectId is an empty string or not provided (undefined), it becomes null.
    // Otherwise, use the provided value (Mongoose will validate if it's a valid ObjectId string).
    clientId: (isWorkDay && clientId && typeof clientId === 'string' && clientId.trim() !== '') ? clientId : null,
    projectId: (isWorkDay && projectId && typeof projectId === 'string' && projectId.trim() !== '') ? projectId : null,
    date: date, // Use the validated date string
    startTime: utcStartTime,
    endTime: utcEndTime,
    lunchBreak: isWorkDay ? (lunchBreak || 'No') : "No", // Default to 'No' if undefined for work day
    lunchDuration: isWorkDay && (lunchBreak === 'Yes') ? (lunchDuration || "00:30") : "00:00", // Default for work day or if leave
    leaveType: leaveType || "None", // Default to "None" if undefined
    totalHours: calculatedTotalHours,
    notes: isWorkDay ? (notes || "") : "",
    description: !isWorkDay ? (description || "") : "",
    hourlyWage: parseFloat(hourlyWage) || 0, // Ensure it's a number
    timezone: userTimezone
  };

  // If it's a leave entry, explicitly nullify/reset work-specific fields
  if (!isWorkDay) {
      finalData.clientId = null;
      finalData.projectId = null;
      finalData.startTime = null;
      finalData.endTime = null;
      finalData.lunchBreak = "No";
      finalData.lunchDuration = "00:00"; // Align with model default or leave policy
      finalData.notes = "";
      // totalHours for leave might be handled differently (e.g., based on leaveType duration)
      // but for this model, it's often 0 for the work part.
      finalData.totalHours = 0;
  }

  return finalData;
};

// @desc    Create a new timesheet entry
// @route   POST /api/timesheets
// @access  Private (e.g., Employee, Employer)
export const createTimesheet = async (req, res) => {
  try {
    // Fetch employer settings first
    const employeeCreatingTimesheet = await Employee.findById(req.body.employeeId);
    if (!employeeCreatingTimesheet || !employeeCreatingTimesheet.employerId) {
      return res.status(400).json({ message: "Cannot determine employer for settings." });
    }
    const settings = await EmployerSetting.findOne({ employerId: employeeCreatingTimesheet.employerId });

    const timesheetData = buildTimesheetData(req.body);

    // Validation based on settings (only if settings are found and it's not a leave entry)
    const isLeaveEntry = timesheetData.leaveType && timesheetData.leaveType !== "None";
    if (settings && !isLeaveEntry) {
      if (settings.timesheetIsProjectClientRequired && !timesheetData.clientId) {
        return res.status(400).json({ message: "Client is required based on employer settings." });
      }
      // If client is required and present, then project is also required
      if (settings.timesheetIsProjectClientRequired && timesheetData.clientId && !timesheetData.projectId) {
        return res.status(400).json({ message: "Project is required." });
      }
      if (settings.timesheetAreNotesRequired && (!timesheetData.notes || timesheetData.notes.trim() === "")) {
        return res.status(400).json({ message: "Work Notes are required based on employer settings." });
      }
    }

    const newTimesheet = new Timesheet(timesheetData);
    const saved = await newTimesheet.save();
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
    const { employeeIds = [], projectId, startDate, endDate } = req.query; // Added projectId
    const filter = {};

    // Filter by Project ID
    if (projectId && mongoose.Types.ObjectId.isValid(projectId)) {
        filter.projectId = projectId;
    } else if (projectId) {
        console.log("[Server Get] Invalid project ID provided, ignoring project filter.");
        // Optionally return empty if project ID is mandatory and invalid
        // return res.json({ timesheets: [], totalHours: 0, avgHours: 0 });
    }

    // Filter by Employee IDs (only if projectId is NOT set, or adjust logic if needed)
    // If you want to filter by *both* project and employee, remove the !filter.projectId condition
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

    // Filter by Date Range
    if (startDate && moment(startDate, 'YYYY-MM-DD', true).isValid()) {
        filter.date = filter.date || {};
        filter.date.$gte = startDate;
    }
    if (endDate && moment(endDate, 'YYYY-MM-DD', true).isValid()) {
        filter.date = filter.date || {};
        filter.date.$lte = endDate;
    }

    // --- Reduced Logging ---
    // console.log(`[Server Get] Finding timesheets with filter:`, JSON.stringify(filter));

    const timesheetsFromDb = await Timesheet.find(filter)
      .populate("employeeId", "name email wage status expectedWeeklyHours")
      .populate("clientId", "name emailAddress")
      .populate("projectId", "name startDate finishDate")
      .sort({ date: 1, startTime: 1 })
      .lean();

    // --- Reduced Logging ---
    // console.log(`[Server Get] Found ${timesheetsFromDb.length} timesheets.`);

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

    // --- Reduced Logging ---
    // if (formattedTimesheets.length > 0) {
    //   console.log(`[Server Get] Structure of first formatted timesheet sent:`, JSON.stringify(formattedTimesheets[0], null, 2));
    // }

    const total = formattedTimesheets.reduce((sum, t) => sum + (t.totalHours || 0), 0);
    const avg = formattedTimesheets.length > 0 ? parseFloat((total / formattedTimesheets.length).toFixed(2)) : 0;

    res.json({
      timesheets: formattedTimesheets,
      totalHours: parseFloat(total.toFixed(2)),
      avgHours: avg,
    });
  } catch (error) {
    console.error("[Server Get] Error fetching timesheets:", error.message);
    // console.error("Full error object:", error); // Keep this for debugging if needed
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
      .lean(); // Use .lean() if you don't need Mongoose document methods

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

    // Fetch the existing timesheet document
    const timesheet = await Timesheet.findById(id).populate('employeeId', 'employerId userId'); // Populate employeeId to get employerId and userId
    if (!timesheet) return res.status(404).json({ message: "Timesheet not found" });

    // Check if employeeId is populated and has an employerId
    if (!timesheet.employeeId || !timesheet.employeeId._id || !timesheet.employeeId.employerId) {
      return res.status(400).json({ message: "Cannot determine employer for settings for this timesheet." });
    }

    // Fetch employer settings
    const employerIdForSettings = timesheet.employeeId.employerId;
    const settings = await EmployerSetting.findOne({ employerId: employerIdForSettings });
    if (!settings) {
      console.warn(`[Server Update] Settings not found for employer ${employerIdForSettings}. Proceeding without settings-based validation.`);
    }

    // Authorization: Check if employee is allowed to edit this timesheet
    if (req.user.role === 'employee') {
      // Ensure employee is only updating their own timesheet
      // Compare the userId on the populated employeeId with the logged-in user's ID
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
      // Ensure employer is updating a timesheet for one of their employees
      if (timesheet.employeeId.employerId.toString() !== req.user.id.toString()) {
        return res.status(403).json({ message: "Forbidden: You can only update timesheets for your own employees." });
      }
    }

    // For a sign-out, the req.body will typically contain:
    // { date (original), endTime, lunchBreak, lunchDuration, notes }
    // We need to preserve other fields like startTime, hourlyWage, timezone, etc.
    // from the existing 'timesheet' document.

    // Re-build/validate data before applying selective updates, considering settings
    // We use req.body combined with existing timesheet data for fields not being updated
    const potentialUpdateData = buildTimesheetData({ ...timesheet.toObject(), ...req.body });

    const isLeaveEntry = potentialUpdateData.leaveType && potentialUpdateData.leaveType !== "None";
    if (settings && !isLeaveEntry) {
      if (settings.timesheetIsProjectClientRequired && !potentialUpdateData.clientId) {
        return res.status(400).json({ message: "Client is required based on employer settings." });
      }
      if (settings.timesheetIsProjectClientRequired && potentialUpdateData.clientId && !potentialUpdateData.projectId) {
        return res.status(400).json({ message: "Project is required." });
      }
      if (settings.timesheetAreNotesRequired && (!potentialUpdateData.notes || potentialUpdateData.notes.trim() === "")) {
        return res.status(400).json({ message: "Work Notes are required based on employer settings." });
      }
    }

    // Selectively update fields from req.body
    // This ensures that fields not present in req.body (like startTime, hourlyWage, original timezone) are preserved.
    if (req.body.date) timesheet.date = req.body.date; // Should be the original date
    if (req.body.endTime) timesheet.endTime = new Date(req.body.endTime); // Ensure it's a Date object
    if (req.body.lunchBreak !== undefined) timesheet.lunchBreak = req.body.lunchBreak;
    if (req.body.lunchDuration !== undefined) timesheet.lunchDuration = req.body.lunchDuration;
    if (req.body.notes !== undefined) timesheet.notes = req.body.notes;
    // Apply other fields from potentialUpdateData if they are part of the update scope
    if (req.body.clientId !== undefined) timesheet.clientId = potentialUpdateData.clientId;
    if (req.body.projectId !== undefined) timesheet.projectId = potentialUpdateData.projectId;
    if (req.body.leaveType !== undefined) timesheet.leaveType = potentialUpdateData.leaveType;
    if (req.body.description !== undefined) timesheet.description = potentialUpdateData.description;
    // If other fields like clientId, projectId, leaveType, description could be updated by this endpoint,
    // they should also be handled conditionally:
    // if (req.body.clientId !== undefined) timesheet.clientId = req.body.clientId ? req.body.clientId : null;
    // if (req.body.projectId !== undefined) timesheet.projectId = req.body.projectId ? req.body.projectId : null;
    // if (req.body.leaveType) timesheet.leaveType = req.body.leaveType;
    // if (req.body.description !== undefined) timesheet.description = req.body.description;
    // if (req.body.hourlyWage !== undefined) timesheet.hourlyWage = parseFloat(req.body.hourlyWage) || 0;
    // if (req.body.timezone && moment.tz.zone(req.body.timezone)) timesheet.timezone = req.body.timezone;

    // Recalculate totalHours using the (preserved) startTime and new endTime
    if (timesheet.startTime && timesheet.endTime) {
        timesheet.totalHours = calculateTotalHours(
            timesheet.startTime, // Preserved from the fetched document
            timesheet.endTime,   // Updated from req.body
            timesheet.lunchBreak,
            timesheet.lunchDuration // This would have been updated from req.body if present
        );
    } else {
        timesheet.totalHours = 0; // Or handle as an error if startTime is missing
    }

    timesheet.updatedAt = Date.now();
    const savedTimesheet = await timesheet.save();
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
    // Fetch employer settings to get reportColumns
    const employerSettings = await EmployerSetting.findOne({ employerId: employerId }).lean();

    let employeesOfEmployer;
    // Determine the list of employee IDs to filter by, ALWAYS scoped to the employer
    if (requestedEmployeeIdsParam && requestedEmployeeIdsParam.length > 0) {
        // If specific employee IDs are requested, validate they belong to the employer
        const validRequestedIds = requestedEmployeeIdsParam.filter(id => mongoose.Types.ObjectId.isValid(id));
        employeesOfEmployer = await Employee.find({
            _id: { $in: validRequestedIds },
            employerId: employerId // Crucial: ensure requested employees belong to this employer
        }).select('_id').lean();
    } else {
        // If no specific employees are requested, get all employees for this employer
        employeesOfEmployer = await Employee.find({ employerId: employerId }).select('_id').lean();
    }

    const finalEmployeeIds = employeesOfEmployer.map(emp => emp._id);

    if (finalEmployeeIds.length === 0) {
        return res.status(404).json({ message: "No employees found for this employer matching the criteria." });
    }
    // Fetch full employee data for use in reports
    const employeesData = await Employee.find({ _id: { $in: finalEmployeeIds } })
                                        .select('name wage expectedHours')
                                        .lean();
    const employeeMap = new Map(employeesData.map(emp => [emp._id.toString(), emp]));

    let projectDetailsMap = new Map(); // Initialize projectDetailsMap here
    const filter = {};
    const filterIds = (ids) => ids.filter(id => mongoose.Types.ObjectId.isValid(id));

    // Always filter by the employer's employees
    filter.employeeId = { $in: finalEmployeeIds };

    // Additional filtering based on groupBy and other parameters
    if (groupBy === 'employee') {
        // The filter.employeeId is already correctly set by finalEmployeeIds.
        // If specific employees were requested, finalEmployeeIds respects that.
        // If no specific employees were requested, finalEmployeeIds includes all employer's employees.
    } else if (groupBy === 'project' && Array.isArray(projectIds) && projectIds.length > 0) {
        const validIds = filterIds(projectIds);
        if (validIds.length > 0) filter.projectId = { $in: validIds }; // employeeId filter is already applied
        else return res.status(400).json({ message: 'No valid project IDs provided for project filtering.' });
    }
    if (startDate && moment(startDate, 'YYYY-MM-DD', true).isValid()) {
        filter.date = { ...filter.date, $gte: startDate };
    }
    if (endDate && moment(endDate, 'YYYY-MM-DD', true).isValid()) {
        filter.date = { ...filter.date, $lte: endDate };
    }

    // --- Reduced Logging ---
    // console.log(`[Server Report] Finding timesheets with filter:`, JSON.stringify(filter));
    const timesheets = await Timesheet.find(filter)
      .populate('employeeId', 'name')
      .populate('clientId', 'name')
      .populate('projectId', 'name')
      .sort(groupBy === 'project' ? { 'projectId.name': 1, date: 1, startTime: 1 } : { 'employeeId.name': 1, date: 1, startTime: 1 })
      .lean();

    // --- Reduced Logging ---
    // console.log(`[Server Report] Found ${timesheets.length} timesheets for report.`);
    if (!timesheets.length) {
      return res.status(404).json({ message: "No timesheets found matching the specified filters." });
    }

    const workbook = new ExcelJS.Workbook();
    workbook.creator = "Timesheet App";
    const ws = workbook.addWorksheet(groupBy === 'project' ? 'Project Timesheets' : 'Employee Timesheets');

    let activeReportColumns = standardReportColumns; // Default to all standard columns

   // If employerSettings.reportColumns is explicitly set by the user and is not empty, use the selected columns.
    // If it's undefined (never set) or an empty array (initial default or user deselected all but wants default), show all.
    if (employerSettings && Array.isArray(employerSettings.reportColumns)) {
      // If the user has made a specific selection (reportColumns is not empty)
      if (employerSettings.reportColumns.length > 0) {
        activeReportColumns = standardReportColumns.filter(col => employerSettings.reportColumns.includes(col.key));
      } // If employerSettings.reportColumns is an empty array [], activeReportColumns remains standardReportColumns (show all)
    }
    ws.columns = activeReportColumns; // Set the final columns for the worksheet, could be empty.

    // Only apply header styling if there are columns to display
    if (activeReportColumns.length > 0) {
      ws.getRow(1).font = { bold: true, alignment: { vertical: 'middle', horizontal: 'center' }, fill: { type: 'pattern', pattern:'solid', fgColor:{argb:'FFD3D3D3'} }, border: { bottom: { style: 'thin' } }};
    }

    if (groupBy === 'project') {
        // Create a map of projects from the fetched timesheets or requested projectIds
        // projectDetailsMap is already initialized above
        if (projectIds && projectIds.length > 0) {
            const validProjectIds = filterIds(projectIds);
            const projectsFromDb = await Project.find({ _id: { $in: validProjectIds } }).select('name').lean();
            projectsFromDb.forEach(p => projectDetailsMap.set(p._id.toString(), p.name));
        } else { // If no specific projects requested, derive from timesheets (if any)
            timesheets.forEach(ts => {
                if (ts.projectId && !projectDetailsMap.has(ts.projectId._id.toString())) {
                    projectDetailsMap.set(ts.projectId._id.toString(), ts.projectId.name);
                }
            });
        }

        if (projectDetailsMap.size === 0 && activeReportColumns.length > 0) { // Only error if columns were expected
             return res.status(404).json({ message: "No projects found for the report criteria." });
        }

        projectDetailsMap.forEach((projectName, currentProjectIdString) => {
            if (activeReportColumns.length > 0) { // Only add project header if there are columns
                const projectHeaderRow = ws.addRow([projectName]);
                projectHeaderRow.font = { bold: true, size: 14 };
                ws.mergeCells(projectHeaderRow.number, 1, projectHeaderRow.number, activeReportColumns.length);
                projectHeaderRow.getCell(1).alignment = { horizontal: 'center' };
                ws.addRow([]); // Blank row after project header
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
                        // Ensure employee name is correctly placed if 'employee' is the first active column
                        if (activeReportColumns.length > 0 && activeReportColumns[0].key === 'employee') {
                            rowDataValues[0] = index === 0 ? employee.name : '';
                        }
                        if (activeReportColumns.length > 0) ws.addRow(rowDataValues); // Only add row if columns exist
                        employeeProjectTotalHours += parseFloat(entry.totalHours || 0);
                        employeeProjectTotalIncome += parseFloat(entry.totalHours || 0) * (employee.wage || 0);
                    });
                } else if (activeReportColumns.length > 0) { // Add empty row only if columns are active
                    const emptyRowDataValues = activeReportColumns.map(col => (col.key === 'employee') ? employee.name : '');
                    ws.addRow(emptyRowDataValues);
                }

                if (activeReportColumns.length > 0) { // Only add summaries if there are columns
                    // Create summary row data as an array based on active columns
                    const summaryExpectedValues = activeReportColumns.map(col => {
                        if (col.key === 'leaveType') return 'EXPECTED';
                        if (col.key === 'totalHours') return employee.expectedHours !== undefined ? String(employee.expectedHours) : '0';
                        return ''; // Empty for other columns
                    });
                    ws.addRow(summaryExpectedValues);

                    const summaryOvertimeValues = activeReportColumns.map(col => {
                        if (col.key === 'leaveType') return 'OVERTIME';
                         if (col.key === 'totalHours') {
                            // Calculate overtime based on total hours for this project/employee and expected hours
                            // This calculation might need refinement if expectedHours is weekly and this is a project-specific report
                            // For simplicity, using 0 here as it's a project-level summary line
                            return '0'; // Placeholder
                         }
                        return ''; // Empty for other columns
                    });
                    ws.addRow(summaryOvertimeValues);

                    const summaryTotalHoursValues = activeReportColumns.map(col => {
                        if (col.key === 'notes') return 'TOTAL HOURS';
                        if (col.key === 'totalHours') return employeeProjectTotalHours.toFixed(2);
                        return ''; // Empty for other columns
                    });
                     ws.addRow(summaryTotalHoursValues);

                    const summaryTotalIncomeValues = activeReportColumns.map(col => {
                        if (col.key === 'notes') return 'TOTAL INCOME EARNED';
                        if (col.key === 'totalHours') return `$${employeeProjectTotalIncome.toFixed(2)}`;
                        return ''; // Empty for other columns
                    });
                    ws.addRow(summaryTotalIncomeValues);
                    ws.addRow([]); // Blank row after each employee's summary
                }
            });
            if (activeReportColumns.length > 0) ws.addRow([]); // Extra blank row after each project section
        });

    } else { // Default to 'employee' grouping or other groupings if ever introduced
        const formattedData = formatDataForReport(timesheets, reportTimezone);
        const groupedData = formattedData.reduce((acc, entry) => {
            const groupKey = entry.employee || `Unknown Employee`; // Use formatted employee name
            (acc[groupKey] = acc[groupKey] || []).push(entry);
            return acc;
        }, {});
        populateWorksheetForEmployeeGrouping(groupedData, ws, activeReportColumns); // Pass activeReportColumns
    }

    const buffer = await workbook.xlsx.writeBuffer();

    // Filename generation needs to be robust
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
    // ws.columns is already set to activeColumns by the caller
    if (activeColumns.length === 0) return; // Don't add data if no columns are active

    Object.entries(groupedByEmployeeName).forEach(([employeeName, entries]) => {
        entries.forEach((entry, index) => {
            const rowValues = activeColumns.map(col => entry[col.key]);
            // Override the employee name for grouping display if 'employee' is the first active column
            if (activeColumns.length > 0 && activeColumns[0].key === 'employee') {
                rowValues[0] = (index === 0) ? employeeName : '';
            }
            ws.addRow(rowValues);
        });
        if (Object.keys(groupedByEmployeeName).length > 1 && entries.length > 0) { // Add spacer if multiple employees and current employee had entries
            ws.addRow({}); // Add a blank row as a spacer
        }
    });
};
