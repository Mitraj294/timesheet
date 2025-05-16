import Timesheet from "../models/Timesheet.js";
import ExcelJS from 'exceljs';
import mongoose from "mongoose";
import moment from "moment-timezone"; // Keep for report formatting consistency for now
import nodemailer from "nodemailer";
import Employee from "../models/Employee.js"; // Import Employee model
import Project from "../models/Project.js"; // Import Project model
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
    const timesheetData = buildTimesheetData(req.body);
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
    const timesheet = await Timesheet.findById(id);
    if (!timesheet) return res.status(404).json({ message: "Timesheet not found" });

    // For a sign-out, the req.body will typically contain:
    // { date (original), endTime, lunchBreak, lunchDuration, notes }
    // We need to preserve other fields like startTime, hourlyWage, timezone, etc.
    // from the existing 'timesheet' document.

    // Selectively update fields from req.body
    // This ensures that fields not present in req.body (like startTime, hourlyWage, original timezone) are preserved.
    if (req.body.date) timesheet.date = req.body.date; // Should be the original date
    if (req.body.endTime) timesheet.endTime = new Date(req.body.endTime); // Ensure it's a Date object
    if (req.body.lunchBreak !== undefined) timesheet.lunchBreak = req.body.lunchBreak;
    if (req.body.lunchDuration !== undefined) timesheet.lunchDuration = req.body.lunchDuration;
    if (req.body.notes !== undefined) timesheet.notes = req.body.notes;
    
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
            timesheet.lunchDuration
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

// handleReportAction function remains the same
const handleReportAction = async (req, res, isDownload, groupBy) => {
  const actionType = isDownload ? 'download' : 'send'; // Renamed to avoid conflict with action variable if any
  const { email, employeeIds: requestedEmployeeIdsParam = [], projectIds = [], startDate, endDate, timezone = 'UTC' } = req.body;
  const employerId = req.user.id; // Get employerId from authenticated user

  if (!isDownload && (!email || !/\S+@\S+\.\S+/.test(email))) {
      return res.status(400).json({ message: 'Valid recipient email is required for sending.' });
  }
  const reportTimezone = timezone && moment.tz.zone(timezone) ? timezone : 'UTC';
  if (reportTimezone === 'UTC' && timezone !== 'UTC') {
      console.warn(`[Server Report] Invalid report timezone '${timezone}'. Using UTC for formatting times.`);
  }

  try {
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
    ws.columns = standardReportColumns; // Use the existing columns

    ws.getRow(1).font = { bold: true, alignment: { vertical: 'middle', horizontal: 'center' }, fill: { type: 'pattern', pattern:'solid', fgColor:{argb:'FFD3D3D3'} }, border: { bottom: { style: 'thin' } }};

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

        if (projectDetailsMap.size === 0) {
             return res.status(404).json({ message: "No projects found for the report criteria." });
        }

        projectDetailsMap.forEach((projectName, currentProjectIdString) => {
            const projectHeaderRow = ws.addRow([projectName]);
            projectHeaderRow.font = { bold: true, size: 14 };
            ws.mergeCells(projectHeaderRow.number, 1, projectHeaderRow.number, standardReportColumns.length);
            projectHeaderRow.getCell(1).alignment = { horizontal: 'center' };
            ws.addRow([]); // Blank row after project header

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
                        const rowData = {};
                        standardReportColumns.forEach(col => { rowData[col.key] = entry[col.key]; });
                        rowData.employee = index === 0 ? employee.name : '';
                        ws.addRow(rowData);
                        employeeProjectTotalHours += parseFloat(entry.totalHours || 0);
                        employeeProjectTotalIncome += parseFloat(entry.totalHours || 0) * (employee.wage || 0);
                    });
                } else {
                    const emptyRowData = {};
                    standardReportColumns.forEach(col => { emptyRowData[col.key] = (col.key === 'employee') ? employee.name : ''; });
                    ws.addRow(emptyRowData);
                }

                // Add summary rows for the employee for this project
                const summaryExpected = {}; standardReportColumns.forEach(col => summaryExpected[col.key] = '');
                summaryExpected.leaveType = 'EXPECTED'; summaryExpected.totalHours = employee.expectedHours !== undefined ? String(employee.expectedHours) : '0';
                ws.addRow(summaryExpected);

                const summaryOvertime = {}; standardReportColumns.forEach(col => summaryOvertime[col.key] = '');
                summaryOvertime.leaveType = 'OVERTIME'; summaryOvertime.totalHours = '0';
                ws.addRow(summaryOvertime);

                const summaryTotalHours = {}; standardReportColumns.forEach(col => summaryTotalHours[col.key] = '');
                summaryTotalHours.notes = 'TOTAL HOURS'; summaryTotalHours.totalHours = employeeProjectTotalHours.toFixed(2);
                ws.addRow(summaryTotalHours);

                const summaryTotalIncome = {}; standardReportColumns.forEach(col => summaryTotalIncome[col.key] = '');
                summaryTotalIncome.notes = 'TOTAL INCOME EARNED'; summaryTotalIncome.totalHours = `$${employeeProjectTotalIncome.toFixed(2)}`;
                ws.addRow(summaryTotalIncome);
                ws.addRow([]); // Blank row after each employee's summary
            });
            ws.addRow([]); // Extra blank row after each project section
        });

    } else { // Default to 'employee' grouping or other groupings if ever introduced
        const formattedData = formatDataForReport(timesheets, reportTimezone);
        const groupedData = formattedData.reduce((acc, entry) => {
            const groupKey = entry[groupBy] || `Unknown ${groupBy}`; // 'employee' or 'project'
            (acc[groupKey] = acc[groupKey] || []).push(entry);
            return acc;
        }, {});
        populateWorksheetForEmployeeGrouping(groupedData, ws);
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
const populateWorksheetForEmployeeGrouping = (groupedByEmployeeName, ws) => {
    // ws.columns is already set to standardReportColumns
    Object.entries(groupedByEmployeeName).forEach(([employeeName, entries]) => {
        entries.forEach((entry, index) => {
            const rowValues = {};
            // Map entryData to the keys defined in standardReportColumns
            standardReportColumns.forEach(col => {
                rowValues[col.key] = entry[col.key];
            });
            // Override the employee name for grouping display
            rowValues.employee = (index === 0) ? employeeName : '';
            ws.addRow(rowValues);
        });
        if (Object.keys(groupedByEmployeeName).length > 1 && entries.length > 0) { // Add spacer if multiple employees and current employee had entries
            ws.addRow({}); // Add a blank row as a spacer
        }
    });
};
