import Timesheet from "../models/Timesheet.js";
import ExcelJS from 'exceljs';
import mongoose from "mongoose";
import moment from "moment-timezone"; // Keep for report formatting consistency for now
import nodemailer from "nodemailer";
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

  if (lunchBreak === "Yes" && lunchDuration && /^\d{2}:\d{2}$/.test(lunchDuration)) {
    const [h, m] = lunchDuration.split(":").map(Number);
    const lunchMinutes = h * 60 + m;
    if (lunchMinutes > 0) {
        totalMinutes -= lunchMinutes;
    }
  }
  const finalTotalMinutes = Math.max(0, totalMinutes);
  const totalHours = parseFloat((finalTotalMinutes / 60).toFixed(2));
  return totalHours;
};

// buildTimesheetData function remains the same
const buildTimesheetData = (body) => {
  const {
    employeeId, clientId, projectId,
    date,
    startTime, endTime,
    lunchBreak, lunchDuration, leaveType,
    notes, description, hourlyWage,
    timezone
  } = body;

  let userTimezone = 'UTC';
  if (timezone && moment.tz.zone(timezone)) {
      userTimezone = timezone;
  } else {
      console.warn(`[Server Build] Invalid or missing timezone received: '${timezone}'. Falling back to UTC.`);
  }

  const isWorkDay = leaveType === "None";

  if (isWorkDay) {
      if (!employeeId || !mongoose.Types.ObjectId.isValid(employeeId)) throw new Error("Invalid Employee ID");
      if (!clientId || !mongoose.Types.ObjectId.isValid(clientId)) throw new Error("Invalid Client ID");
      if (!projectId || !mongoose.Types.ObjectId.isValid(projectId)) throw new Error("Invalid Project ID");
  }

  if (!date || !moment(date, "YYYY-MM-DD", true).isValid()) {
      throw new Error(`Invalid or missing Date string (YYYY-MM-DD format required): '${date}'`);
  }
  const dateString = date;

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
    clientId: isWorkDay ? clientId : null,
    projectId: isWorkDay ? projectId : null,
    date: dateString, // Should be YYYY-MM-DD
    startTime: utcStartTime, // UTC Date object or null
    endTime: utcEndTime, // UTC Date object or null
    lunchBreak: isWorkDay ? lunchBreak : "No",
    lunchDuration: isWorkDay && lunchBreak === 'Yes' ? lunchDuration : "00:00",
    leaveType,
    totalHours: calculatedTotalHours,
    notes: isWorkDay ? (notes || "") : "",
    description: !isWorkDay ? (description || "") : "",
    hourlyWage: hourlyWage || 0,
    timezone: userTimezone
  };

  return finalData;
};

// createTimesheet function remains the same
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

// checkTimesheet function remains the same
export const checkTimesheet = async (req, res) => {
  const { employee, date } = req.query;
  if (!employee || !date) return res.status(400).json({ error: 'Missing employee or date' });
  if (!mongoose.Types.ObjectId.isValid(employee)) return res.status(400).json({ error: 'Invalid employee ID' });
  if (!moment(date, "YYYY-MM-DD", true).isValid()) {
      return res.status(400).json({ error: `Invalid date format (YYYY-MM-DD required): ${date}` });
  }

  try {
    const existing = await Timesheet.findOne({
      employeeId: employee,
      date: date,
    }).lean();
    return res.json({ exists: !!existing, timesheet: existing || null });
  } catch (err) {
    console.error('[Server Check] Error checking timesheet:', err);
    res.status(500).json({ error: 'Server error during timesheet check' });
  }
};


// --- Updated getTimesheets (Reduced Logging) ---
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
    res.status(500).json({ message: "Failed to fetch timesheets", error: error.message });
  }
};
// --- End Updated getTimesheets ---

// updateTimesheet function remains the same
export const updateTimesheet = async (req, res) => {
  try {
    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
        return res.status(400).json({ message: "Invalid Timesheet ID format" });
    }

    const timesheet = await Timesheet.findById(id);
    if (!timesheet) return res.status(404).json({ message: "Timesheet not found" });

    const updatedData = buildTimesheetData({ ...req.body, employeeId: timesheet.employeeId });

    Object.assign(timesheet, updatedData);
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

// getTimesheetsByProject function remains the same
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
        res.status(500).json({ message: "Server Error", error: error.message });
    }
};
// getTimesheetsByEmployee function remains the same
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
        res.status(500).json({ message: "Server Error", error: error.message });
    }
};
// getTimesheetsByClient function remains the same
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
        res.status(500).json({ message: "Server Error", error: error.message });
    }
};

// deleteTimesheet function remains the same
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
        res.status(500).json({ message: "Server Error", error: error.message });
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

// buildWorkbook function remains the same
const buildWorkbook = (groupedData, columns) => {
    const workbook = new ExcelJS.Workbook();
    const ws = workbook.addWorksheet('Timesheets');
    ws.columns = columns;

    ws.getRow(1).font = { bold: true };
    ws.getRow(1).alignment = { vertical: 'middle', horizontal: 'center' };
    ws.getRow(1).fill = {
        type: 'pattern',
        pattern:'solid',
        fgColor:{argb:'FFD3D3D3'}
    };
    ws.getRow(1).border = {
        bottom: { style: 'thin' }
    };

    Object.entries(groupedData).forEach(([groupName, entries]) => {
        entries.forEach((entry, index) => {
            const rowData = { ...entry };
            const groupKeyColumn = columns.find(col => col.key === 'groupKey');
            if (groupKeyColumn) {
                rowData[groupKeyColumn.key] = index === 0 ? groupName : '';
            }
            ws.addRow(rowData);
        });
        if (Object.keys(groupedData).length > 1) {
             ws.addRow({});
        }
    });
    return workbook;
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
  const action = isDownload ? 'download' : 'send';
  const { email, employeeIds = [], projectIds = [], startDate, endDate, timezone = 'UTC' } = req.body;

  if (!isDownload && (!email || !/\S+@\S+\.\S+/.test(email))) {
      return res.status(400).json({ message: 'Valid recipient email is required for sending.' });
  }
  const reportTimezone = timezone && moment.tz.zone(timezone) ? timezone : 'UTC';
  if (reportTimezone === 'UTC' && timezone !== 'UTC') {
      console.warn(`[Server Report] Invalid report timezone '${timezone}'. Using UTC for formatting times.`);
  }

  try {
    const filter = {};
    const filterIds = (ids) => ids.filter(id => mongoose.Types.ObjectId.isValid(id));

    if (groupBy === 'employee' && Array.isArray(employeeIds) && employeeIds.length > 0) {
        const validIds = filterIds(employeeIds);
        if (validIds.length > 0) filter.employeeId = { $in: validIds };
        else return res.status(400).json({ message: 'No valid employee IDs provided for filtering.' });
    } else if (groupBy === 'project' && Array.isArray(projectIds) && projectIds.length > 0) {
        const validIds = filterIds(projectIds);
        if (validIds.length > 0) filter.projectId = { $in: validIds };
        else return res.status(400).json({ message: 'No valid project IDs provided for filtering.' });
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

    const formattedData = formatDataForReport(timesheets, reportTimezone);

    const groupedData = formattedData.reduce((acc, entry) => {
      const groupKey = entry[groupBy] || `Unknown ${groupBy}`;
      (acc[groupKey] = acc[groupKey] || []).push(entry);
      return acc;
    }, {});

    const columns = standardReportColumns.map(col =>
        col.key === groupBy
            ? { ...col, key: 'groupKey', header: groupBy.charAt(0).toUpperCase() + groupBy.slice(1) }
            : col
    );

    const workbook = buildWorkbook(groupedData, columns);
    const buffer = await workbook.xlsx.writeBuffer();

    const groupNames = Object.keys(groupedData);
    const nameLabel = groupNames.length === 1 ? groupNames[0] : `Multiple_${groupBy}s`;
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
    console.error(`[Server Report] Exception during ${action} process:`, error);
    return res.status(500).json({ message: `Failed to ${isDownload ? 'generate report' : 'send email'}. Please try again later.`, error: error.message });
  }
};

// Exported report functions remain the same
export const downloadTimesheets = (req, res) => handleReportAction(req, res, true, 'employee');
export const sendTimesheetEmail = (req, res) => handleReportAction(req, res, false, 'employee');
export const downloadProjectTimesheets = (req, res) => handleReportAction(req, res, true, 'project');
export const sendProjectTimesheetEmail = (req, res) => handleReportAction(req, res, false, 'project');
