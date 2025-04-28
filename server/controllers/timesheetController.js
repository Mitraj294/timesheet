// /home/digilab/timesheet/server/controllers/timesheetController.js
import Timesheet from "../models/Timesheet.js";
import ExcelJS from 'exceljs';
import mongoose from "mongoose";
import moment from "moment-timezone"; // Keep moment for calculations and Excel formatting
import nodemailer from "nodemailer";
import dotenv from "dotenv";
dotenv.config();

// --- Utility Functions ---

// Calculate total hours based on UTC Date objects
const calculateTotalHours = (startTime, endTime, lunchBreak, lunchDuration) => {
  // Check if inputs are valid Date objects using getTime()
  if (!(startTime instanceof Date) || !(endTime instanceof Date) || isNaN(startTime.getTime()) || isNaN(endTime.getTime())) {
      console.warn("[Server Calc] Invalid Date objects passed to calculateTotalHours:", startTime, endTime);
      return 0;
  }
  // Use moment.utc() to treat the Date objects explicitly as UTC for calculation
  const start = moment.utc(startTime);
  const end = moment.utc(endTime);

  if (!start.isValid() || !end.isValid() || end.isSameOrBefore(start)) {
      console.warn("[Server Calc] Invalid start/end times for calculation (moment):", startTime?.toISOString(), endTime?.toISOString());
      return 0;
  }

  let totalMinutes = end.diff(start, "minutes");
  console.log(`[Server Calc] Initial diff (minutes): ${totalMinutes}`);

  if (lunchBreak === "Yes" && lunchDuration && /^\d{2}:\d{2}$/.test(lunchDuration)) {
    const [h, m] = lunchDuration.split(":").map(Number);
    const lunchMinutes = h * 60 + m;
    if (lunchMinutes > 0) {
        totalMinutes -= lunchMinutes;
        console.log(`[Server Calc] Subtracted lunch (minutes): ${lunchMinutes}, Remaining: ${totalMinutes}`);
    }
  }
  const finalTotalMinutes = Math.max(0, totalMinutes);
  const totalHours = parseFloat((finalTotalMinutes / 60).toFixed(2));
  console.log(`[Server Calc] Final totalHours: ${totalHours}`);
  return totalHours;
};


// Build Timesheet Payload from request body
const buildTimesheetData = (body) => {
  console.log("[Server Build] Received body:", JSON.stringify(body, null, 2));

  const {
    employeeId, clientId, projectId,
    date, startTime, endTime, // Expect UTC ISO strings from client
    lunchBreak, lunchDuration, leaveType,
    notes, description, hourlyWage,
    timezone // Expect user's local timezone identifier
  } = body;

  // 1. Validate Timezone (Crucial!)
  let userTimezone = 'UTC'; // Default ONLY if validation fails
  if (timezone && moment.tz.zone(timezone)) {
      userTimezone = timezone; // Use client's valid timezone
  } else {
      console.warn(`[Server Build] Invalid or missing timezone received: '${timezone}'. Falling back to UTC.`);
      // Consider throwing an error if timezone is mandatory and invalid
      // throw new Error(`Invalid or missing timezone received: '${timezone}'`);
  }
  console.log(`[Server Build] Timezone determined for storage/processing: ${userTimezone}`);

  const isWorkDay = leaveType === "None";

  // 2. Validate IDs for Work Day
  if (isWorkDay) {
      if (!clientId || !mongoose.Types.ObjectId.isValid(clientId)) throw new Error("Invalid Client ID");
      if (!projectId || !mongoose.Types.ObjectId.isValid(projectId)) throw new Error("Invalid Project ID");
  }

  // 3. Parse Date String (using determined timezone) -> UTC Midnight Date Object
  let dateObject = null;
  if (date && moment(date, "YYYY-MM-DD", true).isValid()) {
      const dateMoment = moment.tz(date, "YYYY-MM-DD", userTimezone);
      if (dateMoment.isValid()) {
          dateObject = dateMoment.utc().startOf('day').toDate();
          console.log(`[Server Build] Calculated dateObject (UTC midnight): ${dateObject.toISOString()}`);
      } else { throw new Error(`Could not parse date '${date}' in timezone '${userTimezone}'`); }
  } else { throw new Error(`Invalid or missing Date string: '${date}'`); }


  // 4. Parse UTC ISO Time Strings directly into NATIVE Date objects
  let utcStartTime = null;
  if (isWorkDay && startTime) {
      console.log(`[Server Build] Parsing startTime ISO string: ${startTime}`);
      // Use standard JavaScript Date constructor for ISO 8601 strings
      utcStartTime = new Date(startTime);
      // Check if parsing was successful (Date object is not "Invalid Date")
      if (isNaN(utcStartTime.getTime())) {
          console.warn(`[Server Build] Invalid startTime ISO string received (parsed as Invalid Date): ${startTime}`);
          throw new Error(`Invalid Start Time ISO format received: ${startTime}`);
      }
      console.log(`[Server Build] Parsed utcStartTime: ${utcStartTime.toISOString()}`);
  }

  let utcEndTime = null;
  if (isWorkDay && endTime) {
      console.log(`[Server Build] Parsing endTime ISO string: ${endTime}`);
      utcEndTime = new Date(endTime);
      if (isNaN(utcEndTime.getTime())) {
          console.warn(`[Server Build] Invalid endTime ISO string received (parsed as Invalid Date): ${endTime}`);
          throw new Error(`Invalid End Time ISO format received: ${endTime}`);
      }
      console.log(`[Server Build] Parsed utcEndTime: ${utcEndTime.toISOString()}`);
  }

  // 5. Calculate Total Hours (using parsed Date objects)
  const calculatedTotalHours = isWorkDay && utcStartTime instanceof Date && utcEndTime instanceof Date
    ? calculateTotalHours(utcStartTime, utcEndTime, lunchBreak, lunchDuration)
    : 0;
  console.log(`[Server Build] Server calculated totalHours: ${calculatedTotalHours}`);

  // 6. Construct Final Data Object
  const finalData = {
    employeeId,
    clientId: isWorkDay ? clientId : null,
    projectId: isWorkDay ? projectId : null,
    date: dateObject,         // UTC midnight Date object
    startTime: utcStartTime,  // UTC Date object
    endTime: utcEndTime,      // UTC Date object
    lunchBreak: isWorkDay ? lunchBreak : "No",
    lunchDuration: isWorkDay && lunchBreak === 'Yes' ? lunchDuration : "00:00",
    leaveType,
    totalHours: calculatedTotalHours, // Server-calculated hours
    notes: isWorkDay ? (notes || "") : "",
    description: !isWorkDay ? (description || "") : "",
    hourlyWage: hourlyWage || 0,
    timezone: userTimezone // Store the validated timezone identifier
  };

  // Log the data object that will be used to create/update the Mongoose document
  console.log("[Server Build] Final data object prepared:", JSON.stringify(finalData, (key, value) =>
    value instanceof Date ? value.toISOString() : value, 2
  ));
  return finalData;
};

// --- Controller Methods ---

// Create a new timesheet
export const createTimesheet = async (req, res) => {
  try {
    if (!req.body.employeeId || !mongoose.Types.ObjectId.isValid(req.body.employeeId)) {
        return res.status(400).json({ message: "Invalid or missing Employee ID" });
    }
    // Get the processed data object
    const timesheetData = buildTimesheetData(req.body);

    // Create new Mongoose document and explicitly assign fields from the processed data
    const newTimesheet = new Timesheet();
    newTimesheet.employeeId = timesheetData.employeeId;
    newTimesheet.clientId = timesheetData.clientId;
    newTimesheet.projectId = timesheetData.projectId;
    newTimesheet.date = timesheetData.date;
    newTimesheet.startTime = timesheetData.startTime; // Assign Date object
    newTimesheet.endTime = timesheetData.endTime;   // Assign Date object
    newTimesheet.lunchBreak = timesheetData.lunchBreak;
    newTimesheet.lunchDuration = timesheetData.lunchDuration;
    newTimesheet.leaveType = timesheetData.leaveType;
    newTimesheet.totalHours = timesheetData.totalHours; // Assign calculated hours
    newTimesheet.notes = timesheetData.notes;
    newTimesheet.description = timesheetData.description;
    newTimesheet.hourlyWage = timesheetData.hourlyWage;
    newTimesheet.timezone = timesheetData.timezone; // Assign validated timezone

    // Log the Mongoose document just before saving
    console.log("[Server Create] Mongoose document before save:", JSON.stringify(newTimesheet.toObject(), (key, value) =>
        value instanceof Date ? value.toISOString() : value, 2
    ));

    // Save the document
    const saved = await newTimesheet.save();

    // Log the document after saving
    console.log("[Server Create] Timesheet saved successfully:", saved._id);
    console.log("[Server Create] Mongoose document after save:", JSON.stringify(saved.toObject(), (key, value) =>
        value instanceof Date ? value.toISOString() : value, 2
    ));

    res.status(201).json({ message: "Timesheet created successfully", data: saved });
  } catch (error) {
    // Catch errors from buildTimesheetData or save()
    console.error("[Server Create] Error creating timesheet:", error);
    res.status(400).json({ message: error.message || "Error creating timesheet" });
  }
};

// Check Timesheet existence
export const checkTimesheet = async (req, res) => {
  const { employee, date, timezone = 'UTC' } = req.query;
  if (!employee || !date) return res.status(400).json({ error: 'Missing employee or date' });
  if (!mongoose.Types.ObjectId.isValid(employee)) return res.status(400).json({ error: 'Invalid employee ID' });

  const userTimezone = timezone && moment.tz.zone(timezone) ? timezone : 'UTC';

  try {
    const startOfDayLocal = moment.tz(date, "YYYY-MM-DD", userTimezone).startOf('day');
    const endOfDayLocal = moment.tz(date, "YYYY-MM-DD", userTimezone).endOf('day');

    if (!startOfDayLocal.isValid() || !endOfDayLocal.isValid()) {
        return res.status(400).json({ error: `Invalid date or timezone format: ${date}, ${userTimezone}` });
    }

    const startUTC = startOfDayLocal.utc().toDate();
    const endUTC = endOfDayLocal.utc().toDate();

    const existing = await Timesheet.findOne({
      employeeId: employee,
      date: { $gte: startUTC, $lte: endUTC },
    });

    return res.json({ exists: !!existing, timesheet: existing || null });
  } catch (err) {
    console.error('[Server Check] Error checking timesheet:', err);
    res.status(500).json({ error: 'Server error during timesheet check' });
  }
};

// Get timesheets (filtered) - Sends back raw UTC data
export const getTimesheets = async (req, res) => {
  try {
    const { employeeIds = [], startDate, endDate } = req.query;
    const filter = {};

    if (employeeIds.length > 0) {
      const ids = Array.isArray(employeeIds) ? employeeIds : employeeIds.split(",");
      const validIds = ids.filter(id => mongoose.Types.ObjectId.isValid(id));
      if (validIds.length > 0) {
          filter.employeeId = { $in: validIds };
      } else if (ids.length > 0) {
          return res.json({ timesheets: [], totalHours: 0, avgHours: 0 });
      }
    }

    if (startDate && moment(startDate, 'YYYY-MM-DD', true).isValid()) {
        filter.date = filter.date || {};
        filter.date.$gte = moment.utc(startDate).startOf('day').toDate();
    }
    if (endDate && moment(endDate, 'YYYY-MM-DD', true).isValid()) {
        filter.date = filter.date || {};
        filter.date.$lte = moment.utc(endDate).endOf('day').toDate();
    }

    const timesheets = await Timesheet.find(filter)
      .populate("employeeId", "name email wage status expectedWeeklyHours")
      .populate("clientId", "name emailAddress")
      .populate("projectId", "name startDate finishDate")
      .sort({ date: 1, startTime: 1 });

    const total = timesheets.reduce((sum, t) => sum + (t.totalHours || 0), 0);
    const avg = timesheets.length ? parseFloat((total / timesheets.length).toFixed(2)) : 0;

    res.json({
      timesheets: timesheets,
      totalHours: parseFloat(total.toFixed(2)),
      avgHours: avg,
    });
  } catch (error) {
    console.error("[Server Get] Error fetching timesheets:", error);
    res.status(500).json({ message: "Failed to fetch timesheets", error: error.message });
  }
};

// Update a timesheet
export const updateTimesheet = async (req, res) => {
  try {
    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
        return res.status(400).json({ message: "Invalid Timesheet ID format" });
    }

    const timesheet = await Timesheet.findById(id);
    if (!timesheet) return res.status(404).json({ message: "Timesheet not found" });

    // Get the processed data object
    const updatedData = buildTimesheetData({ ...req.body, employeeId: timesheet.employeeId });

    // Explicitly assign fields to the existing document
    timesheet.clientId = updatedData.clientId;
    timesheet.projectId = updatedData.projectId;
    timesheet.date = updatedData.date;
    timesheet.startTime = updatedData.startTime; // Assign Date object
    timesheet.endTime = updatedData.endTime;   // Assign Date object
    timesheet.lunchBreak = updatedData.lunchBreak;
    timesheet.lunchDuration = updatedData.lunchDuration;
    timesheet.leaveType = updatedData.leaveType;
    timesheet.totalHours = updatedData.totalHours; // Assign calculated hours
    timesheet.notes = updatedData.notes;
    timesheet.description = updatedData.description;
    timesheet.hourlyWage = updatedData.hourlyWage;
    timesheet.timezone = updatedData.timezone; // Assign validated timezone

    // Log the Mongoose document just before saving the update
    console.log("[Server Update] Mongoose document before save:", JSON.stringify(timesheet.toObject(), (key, value) =>
        value instanceof Date ? value.toISOString() : value, 2
    ));

    // Save the updated document
    const savedTimesheet = await timesheet.save();

    // Log the document after saving the update
    console.log("[Server Update] Timesheet updated successfully:", savedTimesheet._id);
    console.log("[Server Update] Mongoose document after save:", JSON.stringify(savedTimesheet.toObject(), (key, value) =>
        value instanceof Date ? value.toISOString() : value, 2
    ));

    res.json({ message: "Timesheet updated successfully", timesheet: savedTimesheet });
  } catch (error) {
    // Catch errors from buildTimesheetData or save()
    console.error("[Server Update] Error updating timesheet:", error);
    res.status(400).json({ message: error.message || "Error updating timesheet" });
  }
};


// --- Other Getters (By Project, Employee, Client) ---
export const getTimesheetsByProject = async (req, res) => { /* ... */ };
export const getTimesheetsByEmployee = async (req, res) => { /* ... */ };
export const getTimesheetsByClient = async (req, res) => { /* ... */ };

// Delete a timesheet
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
        res.status(200).json({ message: "Timesheet deleted successfully" });
      } catch (error) {
        console.error("[Server Delete] Error deleting timesheet:", error);
        res.status(500).json({ message: "Server Error", error: error.message });
      }
 };


// --- Excel and Email Functions ---
// Use stored timezone for formatting

// Helper function to format data for Excel/Email
const formatDataForReport = (timesheets) => {
    return timesheets.map(ts => {
        const reportTimezone = ts.timezone && moment.tz.zone(ts.timezone) ? ts.timezone : 'UTC';
        const localDate = ts.date ? moment(ts.date).tz(reportTimezone).format("YYYY-MM-DD") : "";
        // Ensure startTime/endTime are valid Date objects before formatting
        const localStartTime = ts.startTime instanceof Date && !isNaN(ts.startTime.getTime())
                             ? moment(ts.startTime).tz(reportTimezone).format("HH:mm") : "";
        const localEndTime = ts.endTime instanceof Date && !isNaN(ts.endTime.getTime())
                           ? moment(ts.endTime).tz(reportTimezone).format("HH:mm") : "";
        const dayOfWeek = ts.date ? moment(ts.date).tz(reportTimezone).format('dddd') : "";

        return {
            employee: ts.employeeId?.name || 'Unknown',
            date: localDate, day: dayOfWeek,
            client: ts.clientId?.name || '', project: ts.projectId?.name || '',
            startTime: localStartTime, endTime: localEndTime,
            lunchBreak: ts.lunchBreak || 'No',
            lunchDuration: ts.lunchBreak === 'Yes' ? (ts.lunchDuration || '00:00') : '',
            leaveType: ts.leaveType === 'None' ? '' : (ts.leaveType || ''),
            description: ts.description || '', notes: ts.notes || '',
            hourlyWage: ts.hourlyWage != null ? `$${parseFloat(ts.hourlyWage).toFixed(2)}` : '',
            totalHours: ts.totalHours != null ? parseFloat(ts.totalHours).toFixed(2) : '0.00',
        };
    });
};



const buildWorkbook = (groupedData, columns) => {
    const workbook = new ExcelJS.Workbook();
    const ws = workbook.addWorksheet('Timesheets');
    ws.columns = columns;

    // Style header row
    ws.getRow(1).font = { bold: true };
    ws.getRow(1).alignment = { vertical: 'middle', horizontal: 'center' };
    ws.getRow(1).fill = {
        type: 'pattern',
        pattern:'solid',
        fgColor:{argb:'FFD3D3D3'} // Light grey background
    };
    ws.getRow(1).border = {
        bottom: { style: 'thin' }
    };

    // Add data rows with grouping
    Object.entries(groupedData).forEach(([groupName, entries]) => {
        entries.forEach((entry, index) => {
            // Add group name only for the first row of the group
            const rowData = { ...entry };
            if (columns.some(col => col.key === 'groupKey')) { // Check if grouping column exists
                rowData.groupKey = index === 0 ? groupName : '';
            }
            ws.addRow(rowData);
        });
        // Add a blank row between groups for separation
        ws.addRow({});
    });

    // Auto-fit columns based on content (optional, can be slow for large data)
    // ws.columns.forEach(column => {
    //     let maxLen = column.header.length;
    //     column.eachCell({ includeEmpty: true }, cell => {
    //         const len = cell.value ? cell.value.toString().length : 0;
    //         if (len > maxLen) maxLen = len;
    //     });
    //     column.width = maxLen < 10 ? 10 : maxLen + 2;
    // });

    return workbook;
};

// Define standard columns for reports
const standardReportColumns = [
      { header: 'Full Name', key: 'employee', width: 25 },
      { header: 'Date', key: 'date', width: 15, style: { numFmt: 'yyyy-mm-dd' } },
      { header: 'Day', key: 'day', width: 12 },
      { header: 'Client', key: 'client', width: 25 },
      { header: 'Project', key: 'project', width: 25 },
      { header: 'Start', key: 'startTime', width: 10 },
      { header: 'End', key: 'endTime', width: 10 },
      { header: 'Lunch', key: 'lunchDuration', width: 10 }, // Combined Lunch info
      { header: 'Leave Type', key: 'leaveType', width: 15 },
      { header: 'Description', key: 'description', width: 30 }, // For leave
      { header: 'Work Notes', key: 'notes', width: 30 }, // For work
      { header: 'Wage', key: 'hourlyWage', width: 10, style: { numFmt: '$#,##0.00' } },
      { header: 'Total Hours', key: 'totalHours', width: 12, style: { numFmt: '0.00' } },
];

// Download timesheets as an Excel file (Employee based)
export const downloadTimesheets = async (req, res) => {
  try {
    // Default timezone if not provided by client
    const { employeeIds = [], startDate, endDate, timezone = 'UTC' } = req.body;

    const filter = {};
    if (employeeIds.length) {
        const validIds = employeeIds.filter(id => mongoose.Types.ObjectId.isValid(id));
        if (validIds.length > 0) filter.employeeId = { $in: validIds };
        else if (employeeIds.length > 0) return res.status(404).json({ error: 'No valid employee IDs provided' });
    }
    if (startDate && moment(startDate, 'YYYY-MM-DD', true).isValid()) {
        filter.date = filter.date || {};
        filter.date.$gte = moment.utc(startDate).startOf('day').toDate();
    }
    if (endDate && moment(endDate, 'YYYY-MM-DD', true).isValid()) {
        filter.date = filter.date || {};
        filter.date.$lte = moment.utc(endDate).endOf('day').toDate();
    }

    const timesheets = await Timesheet.find(filter)
      .populate('employeeId', 'name')
      .populate('clientId', 'name')
      .populate('projectId', 'name')
      .sort({ 'employeeId.name': 1, date: 1, startTime: 1 }); // Sort by name, then date

    if (!timesheets.length) {
      return res.status(404).json({ error: 'No timesheets found for the given filters' });
    }

    // Format data for display in the target timezone
    const formattedData = formatDataForReport(timesheets, timezone);

    // Group by employee name for the report structure
    const groupedByEmployee = formattedData.reduce((acc, entry) => {
      const empName = entry.employee || 'Unknown';
      (acc[empName] = acc[empName] || []).push(entry);
      return acc;
    }, {});

    // Define columns, using 'employee' as the grouping key display column
    const columns = standardReportColumns.map(col => col.key === 'employee' ? { ...col, key: 'groupKey' } : col);

    const workbook = buildWorkbook(groupedByEmployee, columns);
    const buffer = await workbook.xlsx.writeBuffer();

    // Build filename
    const employeeNames = Object.keys(groupedByEmployee);
    const nameLabel = employeeNames.length === 1 ? employeeNames[0] : 'Multiple_Employees';
    const startLabel = startDate ? moment(startDate).format('YYYYMMDD') : 'Start';
    const endLabel = endDate ? moment(endDate).format('YYYYMMDD') : 'End';
    const fileName = `${nameLabel}_Timesheet_${startLabel}_to_${endLabel}.xlsx`;

    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename="${fileName}"; filename*=UTF-8''${encodeURIComponent(fileName)}`);
    return res.send(buffer);

  } catch (error) {
    console.error('Employee Timesheet Excel download error:', error);
    return res.status(500).json({ error: 'Failed to generate Excel file' });
  }
};

// Send email with timesheet (Employee based)
export const sendTimesheetEmail = async (req, res) => {
  const { email, employeeIds = [], startDate, endDate, timezone = 'UTC' } = req.body;
  if (!email || !/\S+@\S+\.\S+/.test(email)) {
      return res.status(400).json({ message: 'Invalid recipient email address.' });
  }

  try {
    const filter = {};
    if (employeeIds.length) {
        const validIds = employeeIds.filter(id => mongoose.Types.ObjectId.isValid(id));
        if (validIds.length > 0) filter.employeeId = { $in: validIds };
        else if (employeeIds.length > 0) return res.status(404).json({ message: 'No valid employee IDs provided' });
    }
    if (startDate && moment(startDate, 'YYYY-MM-DD', true).isValid()) {
        filter.date = filter.date || {};
        filter.date.$gte = moment.utc(startDate).startOf('day').toDate();
    }
    if (endDate && moment(endDate, 'YYYY-MM-DD', true).isValid()) {
        filter.date = filter.date || {};
        filter.date.$lte = moment.utc(endDate).endOf('day').toDate();
    }

    const timesheets = await Timesheet.find(filter)
      .populate("employeeId", "name")
      .populate("clientId", "name")
      .populate("projectId", "name")
      .sort({ 'employeeId.name': 1, date: 1, startTime: 1 });

    if (!timesheets.length) {
      return res.status(404).json({ message: "No timesheets found for the given filters to send" });
    }

    const formattedData = formatDataForReport(timesheets, timezone);
    const groupedByEmployee = formattedData.reduce((acc, entry) => {
      const empName = entry.employee || "Unknown";
      (acc[empName] = acc[empName] || []).push(entry);
      return acc;
    }, {});

    const columns = standardReportColumns.map(col => col.key === 'employee' ? { ...col, key: 'groupKey' } : col);
    const workbook = buildWorkbook(groupedByEmployee, columns);
    const buffer = await workbook.xlsx.writeBuffer();

    const employeeNames = Object.keys(groupedByEmployee);
    const nameLabel = employeeNames.length === 1 ? employeeNames[0] : 'Multiple_Employees';
    const startLabel = startDate ? moment(startDate).format('YYYYMMDD') : 'Start';
    const endLabel = endDate ? moment(endDate).format('YYYYMMDD') : 'End';
    const fileName = `${nameLabel}_Timesheet_${startLabel}_to_${endLabel}.xlsx`;

    const transporter = nodemailer.createTransport({
      service: "gmail",
      auth: { user: process.env.EMAIL_USER, pass: process.env.EMAIL_PASS },
    });

    const mailOptions = {
      from: process.env.EMAIL_USER,
      to: email,
      subject: `Timesheet Report: ${nameLabel} (${startLabel} - ${endLabel})`,
      text: `Please find the attached timesheet report for ${nameLabel} covering the period from ${startDate || 'start'} to ${endDate || 'end'}.`,
      attachments: [{ filename: fileName, content: buffer }],
    };

    await transporter.sendMail(mailOptions);
    res.status(200).send({ message: "Timesheet email sent successfully!" });
  } catch (error) {
    console.error("Error sending employee timesheet email:", error);
    // Check for specific nodemailer errors if needed
    res.status(500).send({ message: "Failed to send email. Please try again." });
  }
};

// Download timesheets by project as Excel
export const downloadProjectTimesheets = async (req, res) => {
  try {
    const { projectIds = [], startDate, endDate, timezone = 'UTC' } = req.body;

    const filter = {};
    if (projectIds.length) {
        const validIds = projectIds.filter(id => mongoose.Types.ObjectId.isValid(id));
        if (validIds.length > 0) filter.projectId = { $in: validIds };
        else if (projectIds.length > 0) return res.status(404).json({ error: 'No valid project IDs provided' });
    }
    if (startDate && moment(startDate, 'YYYY-MM-DD', true).isValid()) {
        filter.date = filter.date || {};
        filter.date.$gte = moment.utc(startDate).startOf('day').toDate();
    }
    if (endDate && moment(endDate, 'YYYY-MM-DD', true).isValid()) {
        filter.date = filter.date || {};
        filter.date.$lte = moment.utc(endDate).endOf('day').toDate();
    }

    const timesheets = await Timesheet.find(filter)
      .populate('employeeId', 'name')
      .populate('clientId', 'name')
      .populate('projectId', 'name')
      .sort({ 'projectId.name': 1, date: 1, startTime: 1 }); // Sort by project name, then date

    if (!timesheets.length) {
      return res.status(404).json({ error: 'No timesheets found for the given filters' });
    }

    const formattedData = formatDataForReport(timesheets, timezone);

    // Group by project name
    const groupedByProject = formattedData.reduce((acc, entry) => {
      const projectName = entry.project || 'Unknown Project';
      (acc[projectName] = acc[projectName] || []).push(entry);
      return acc;
    }, {});

    // Define columns, using 'project' as the grouping key display column
    const columns = standardReportColumns.map(col => col.key === 'project' ? { ...col, key: 'groupKey', header: 'Project' } : col);

    const workbook = buildWorkbook(groupedByProject, columns);
    const buffer = await workbook.xlsx.writeBuffer();

    const projectNames = Object.keys(groupedByProject);
    const nameLabel = projectNames.length === 1 ? projectNames[0] : 'Multiple_Projects';
    const startLabel = startDate ? moment(startDate).format('YYYYMMDD') : 'Start';
    const endLabel = endDate ? moment(endDate).format('YYYYMMDD') : 'End';
    const fileName = `${nameLabel}_Project_Timesheet_${startLabel}_to_${endLabel}.xlsx`;

    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename="${fileName}"; filename*=UTF-8''${encodeURIComponent(fileName)}`);
    return res.send(buffer);

  } catch (error) {
    console.error('Project Timesheet Excel download error:', error);
    return res.status(500).json({ error: 'Failed to generate Excel file' });
  }
};

// Send project-based timesheet email
export const sendProjectTimesheetEmail = async (req, res) => {
  const { email, projectIds = [], startDate, endDate, timezone = 'UTC' } = req.body;
   if (!email || !/\S+@\S+\.\S+/.test(email)) {
      return res.status(400).json({ message: 'Invalid recipient email address.' });
  }

  try {
    const filter = {};
     if (projectIds.length) {
        const validIds = projectIds.filter(id => mongoose.Types.ObjectId.isValid(id));
        if (validIds.length > 0) filter.projectId = { $in: validIds };
        else if (projectIds.length > 0) return res.status(404).json({ message: 'No valid project IDs provided' });
    }
    if (startDate && moment(startDate, 'YYYY-MM-DD', true).isValid()) {
        filter.date = filter.date || {};
        filter.date.$gte = moment.utc(startDate).startOf('day').toDate();
    }
    if (endDate && moment(endDate, 'YYYY-MM-DD', true).isValid()) {
        filter.date = filter.date || {};
        filter.date.$lte = moment.utc(endDate).endOf('day').toDate();
    }

    const timesheets = await Timesheet.find(filter)
      .populate("employeeId", "name")
      .populate("clientId", "name")
      .populate("projectId", "name")
      .sort({ 'projectId.name': 1, date: 1, startTime: 1 });

    if (!timesheets.length) return res.status(404).json({ message: "No timesheets found for the given filters to send" });

    const formattedData = formatDataForReport(timesheets, timezone);
    const groupedByProject = formattedData.reduce((acc, entry) => {
      const projectName = entry.project || "Unknown Project";
      (acc[projectName] = acc[projectName] || []).push(entry);
      return acc;
    }, {});

    const columns = standardReportColumns.map(col => col.key === 'project' ? { ...col, key: 'groupKey', header: 'Project' } : col);
    const workbook = buildWorkbook(groupedByProject, columns);
    const buffer = await workbook.xlsx.writeBuffer();

    const projectNames = Object.keys(groupedByProject);
    const nameLabel = projectNames.length === 1 ? projectNames[0] : 'Multiple_Projects';
    const startLabel = startDate ? moment(startDate).format('YYYYMMDD') : 'Start';
    const endLabel = endDate ? moment(endDate).format('YYYYMMDD') : 'End';
    const fileName = `${nameLabel}_Project_Timesheet_${startLabel}_to_${endLabel}.xlsx`;

    const transporter = nodemailer.createTransport({
      service: "gmail",
      auth: { user: process.env.EMAIL_USER, pass: process.env.EMAIL_PASS },
    });

    const mailOptions = {
      from: process.env.EMAIL_USER,
      to: email,
      subject: `Project Timesheet Report: ${nameLabel} (${startLabel} - ${endLabel})`,
      text: `Please find the attached project timesheet report for ${nameLabel} covering the period from ${startDate || 'start'} to ${endDate || 'end'}.`,
      attachments: [{ filename: fileName, content: buffer }],
    };

    await transporter.sendMail(mailOptions);
    res.status(200).send({ message: "Project timesheet email sent successfully!" });
  } catch (error) {
    console.error("Error sending project timesheet email:", error);
    res.status(500).send({ message: "Failed to send email. Please try again." });
  }
};
