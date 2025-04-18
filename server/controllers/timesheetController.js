import Timesheet from "../models/Timesheet.js";
import ExcelJS from 'exceljs';
import mongoose from "mongoose";
import moment from "moment-timezone";
import nodemailer from "nodemailer";
import dotenv from "dotenv";
dotenv.config();

// Utility functions


const toUTC = (date, time, timezone) => {
  return moment.tz(`${date} ${time}`, "YYYY-MM-DD HH:mm", timezone).utc().toDate();
};

/*const toLocalTime = (utcTime, timezone) => {
  return moment(utcTime).tz(timezone).format("YYYY-MM-DD HH:mm A");
};*/


const calculateTotalHours = (startTime, endTime, lunchBreak, lunchDuration) => {
  const start = moment(startTime);
  const end = moment(endTime);
  let totalHours = end.diff(start, "minutes") / 60;
  if (lunchBreak === "Yes" && lunchDuration) {
    const [h, m] = lunchDuration.split(":").map(Number);
    totalHours -= h + m / 60;
  }
  return Math.max(0, totalHours);
};

// Convert a Timesheet mongoose doc from UTC → local

const convertTimesheetToLocal = (ts, timezone) => ({
  ...ts._doc,
  timezone,
  startTime: ts.startTime 
    ? moment(ts.startTime).tz(timezone).format("HH:mm") 
    : "",
  endTime:   ts.endTime 
    ? moment(ts.endTime)  .tz(timezone).format("HH:mm") 
    : "",
  date:      moment(ts.date)       .tz(timezone).format("YYYY-MM-DD"),
});

// Build Timesheet Payload

const buildTimesheetData = (body) => {
  const {
    employeeId, clientId, projectId, date,
    startTime, endTime, lunchBreak, lunchDuration,
    leaveType, timezone = "UTC"
  } = body;

  const isWorkDay = leaveType === "None";

  if (isWorkDay && (!mongoose.Types.ObjectId.isValid(clientId) || !mongoose.Types.ObjectId.isValid(projectId))) {
    throw new Error("Invalid Client or Project ID");
  }

  const utcStartTime = isWorkDay ? toUTC(date, startTime, timezone) : null;
  const utcEndTime = isWorkDay ? toUTC(date, endTime, timezone) : null;
  const totalHours = isWorkDay ? calculateTotalHours(utcStartTime, utcEndTime, lunchBreak, lunchDuration) : 0;

  return {
    employeeId,
    clientId: isWorkDay ? clientId : null,
    projectId: isWorkDay ? projectId : null,
    date: new Date(date),
    startTime: utcStartTime,
    endTime: utcEndTime,
    lunchBreak: isWorkDay ? lunchBreak : "No",
    lunchDuration: isWorkDay ? lunchDuration : "00:00",
    leaveType,
    totalHours,
  };
};

// Create a new timesheet
export const createTimesheet = async (req, res) => {
  try {
    const newTimesheet = new Timesheet(buildTimesheetData(req.body));
    const saved = await newTimesheet.save();
    res.status(201).json({ message: "Timesheet created successfully", data: saved });
  } catch (error) {
    console.error("Error creating timesheet:", error);
    res.status(400).json({ message: "Error creating timesheet", error: error.message });
  }
};

// Check Timesheet
export const checkTimesheet = async (req, res) => {
  const { employee, date } = req.query;
  if (!employee || !date) return res.status(400).json({ error: 'Missing employee or date' });

  try {
    const start = new Date(date); start.setUTCHours(0, 0, 0, 0);
    const end = new Date(date); end.setUTCHours(23, 59, 59, 999);

    const existing = await Timesheet.findOne({
      employeeId: employee,
      date: { $gte: start, $lte: end },
    });

    return res.json({ exists: !!existing, timesheet: existing || null });
  } catch (err) {
    console.error('Error checking timesheet:', err);
    res.status(500).json({ error: 'Server error' });
  }
};
// Get all timesheets
export const getTimesheets = async (req, res) => {
  try {
    const { timezone = "UTC" } = req.query;

   const { email, employeeIds = [], startDate, endDate } = req.body;

const filter = {};
if (employeeIds.length > 0) filter.employeeId = { $in: employeeIds };
if (startDate && endDate) {
  filter.date = {
    $gte: new Date(startDate),
    $lte: new Date(endDate),
  };
}

const timesheets = await Timesheet.find(filter)
      .populate("employeeId", "name email")
      .populate("clientId", "name emailAddress")
      .populate("projectId", "name startDate finishDate")
      .sort({ createdAt: -1 });

    if (!timesheets.length)
      return res.status(404).json({ message: "No timesheets found" });

    const timesheetsWithLocal = timesheets.map(t => convertTimesheetToLocal(t, timezone));

    const total = timesheets.reduce((sum, t) => sum + (t.totalHours || 0), 0);
    const avg = timesheets.length ? (total / timesheets.length).toFixed(1) : 0;

    res.json({ timesheets: timesheetsWithLocal, totalHours: total, avgHours: avg });
  } catch (error) {
    console.error("Error fetching timesheets:", error);
    res.status(500).json({ message: error.message });
  }
};

// Update a timesheet
export const updateTimesheet = async (req, res) => {
  try {
    const { id } = req.params;
    const timesheet = await Timesheet.findById(id);
    if (!timesheet) return res.status(404).json({ message: "Timesheet not found" });

    Object.assign(timesheet, buildTimesheetData({ ...req.body, employeeId: timesheet.employeeId }));
    await timesheet.save();
    res.json({ message: "Timesheet updated successfully", timesheet });
  } catch (error) {
    console.error("Error updating timesheet:", error);
    res.status(400).json({ message: "Error updating timesheet", error: error.message });
  }
};
/// Get timesheets by projectId only
export const getTimesheetsByProject = async (req, res) => {
  try {
    const { projectId } = req.params;
    const { timezone = "UTC" } = req.query;
    if (!mongoose.Types.ObjectId.isValid(projectId)) {
      return res.status(400).json({ message: "Invalid Project ID" });
    }
    const projectObjectId = new mongoose.Types.ObjectId(projectId);
    console.log("Fetching timesheets for project:", projectObjectId);
    const timesheets = await Timesheet.find({ projectId: projectObjectId })
      .populate("employeeId", "name email")
      .populate("clientId", "name emailAddress")
      .populate("projectId", "name startDate finishDate")
      .sort({ createdAt: -1 });
    if (!timesheets.length) {
      return res.status(404).json({ message: "No timesheets found for this project" });
    }

    // Convert UTC to local time
    const localTimesheets = timesheets.map(t => convertTimesheetToLocal(t, timezone));

    const totalHours = timesheets.reduce((sum, t) => sum + (t.totalHours || 0), 0);
    const avgHours = timesheets.length ? (totalHours / timesheets.length).toFixed(1) : 0;
    res.json({ timesheets: localTimesheets, totalHours, avgHours });
  } catch (error) {
    console.error("Error fetching timesheets by project:", error);
    res.status(500).json({ message: "Internal Server Error", error: error.message });
  }
};

// Get timesheets by employeeId only
export const getTimesheetsByEmployee = async (req, res) => {
  try {
    const { employeeId } = req.params;
    const timezone = req.query.timezone || "UTC";

    if (!mongoose.Types.ObjectId.isValid(employeeId)) {
      return res.status(400).json({ message: "Invalid Employee ID" });
    }

    const timesheets = await Timesheet.find({ employeeId })
      .populate("clientId", "name emailAddress")
      .populate("projectId", "name startDate finishDate")
      .sort({ createdAt: -1 });

    if (!timesheets.length) {
      return res.status(404).json({ message: "No timesheets found for this employee" });
    }

    // ← use our helper here:
    const localTimesheets = timesheets.map(ts => 
      convertTimesheetToLocal(ts, timezone)
    );

    const totalHours = timesheets.reduce((sum, t) => sum + (t.totalHours || 0), 0);
    const avgHours   = timesheets.length
      ? (totalHours / timesheets.length).toFixed(1)
      : 0;

    res.json({ timesheets: localTimesheets, totalHours, avgHours });
  } catch (error) {
    console.error("Error fetching timesheets by employee:", error);
    res.status(500).json({ message: "Internal Server Error", error: error.message });
  }
};

// Get timesheets by clientId only
export const getTimesheetsByClient = async (req, res) => {
  try {
    const { clientId } = req.params;
    const { timezone = "UTC" } = req.query;
    if (!mongoose.Types.ObjectId.isValid(clientId)) {
      return res.status(400).json({ message: "Invalid client ID" });
    }
    const clientObjectId = new mongoose.Types.ObjectId(clientId);
    console.log("Fetching timesheets for client:", clientObjectId);
    const timesheets = await Timesheet.find({ clientId: clientObjectId })
      .populate("clientId", "name emailAddress")
      .populate("projectId", "name startDate finishDate")
      .sort({ createdAt: -1 });
    if (!timesheets.length) {
      return res.status(404).json({ message: "No timesheets found for this client" });
    }

    // Convert UTC to local time
    const localTimesheets = timesheets.map(t => convertTimesheetToLocal(t, timezone));

    const totalHours = timesheets.reduce((sum, t) => sum + (t.totalHours || 0), 0);
    const avgHours = timesheets.length ? (totalHours / timesheets.length).toFixed(1) : 0;
    res.json({ timesheets: localTimesheets, totalHours, avgHours });
  } catch (error) {
    console.error("Error fetching timesheets by client:", error);
    res.status(500).json({ message: "Internal Server Error", error: error.message });
  }
};

// Delete a timesheet
export const deleteTimesheet = async (req, res) => {
  try {
    const deletedTimesheet = await Timesheet.findByIdAndDelete(req.params.id);
    if (!deletedTimesheet) {
      return res.status(404).json({ message: "Timesheet not found" });
    }
    res.status(200).json({ message: "Timesheet deleted successfully" });
  } catch (error) {
    console.error("Error deleting timesheet:", error);
    res.status(500).json({ message: "Server Error", error });
  }
};



// Download timesheets as an Excel file
export const downloadTimesheets = async (req, res) => {
  try {
    const { employeeIds = [], startDate, endDate, timezone = 'Asia/Kolkata' } = req.body;

    // 1️⃣ Build your Mongo filter
    const filter = {};
    if (employeeIds.length)    filter.employeeId = { $in: employeeIds };
    if (startDate && endDate)  filter.date       = {
      $gte: new Date(startDate),
      $lte: new Date(endDate)
    };

    // 2️⃣ Fetch, populate, convert to local time
    const timesheets = await Timesheet.find(filter)
      .populate('employeeId')
      .populate('clientId')
      .populate('projectId');

    if (!timesheets.length) {
      return res.status(404).json({ error: 'No timesheets found for the given filters' });
    }

    const localized = timesheets.map(ts => convertTimesheetToLocal(ts, timezone));

    // 3️⃣ Build the Excel workbook in-memory
    const workbook = new ExcelJS.Workbook();
    const ws = workbook.addWorksheet('Timesheets');
    ws.columns = [
      { header: 'Full Name', key: 'employee', width: 20 },
      { header: 'Date', key: 'date', width: 15 },
      { header: 'Day', key: 'day', width: 12 },
      { header: 'Client', key: 'client', width: 20 },
      { header: 'Project', key: 'project', width: 20 },
      { header: 'Start', key: 'startTime', width: 15 },
      { header: 'End', key: 'endTime', width: 15 },
      { header: 'Lunch Break', key: 'lunchBreak', width: 12 },
      { header: 'Lunch Duration', key: 'lunchDuration', width: 15 },
      { header: 'Leave Type', key: 'leaveType', width: 20 },
      { header: 'Description', key: 'description', width: 30 },
      { header: 'Hourly Wage', key: 'hourlyWage', width: 15 },
      { header: 'Total Hours', key: 'totalHours', width: 15 },
    ];

    // Group by employee
    const byEmp = localized.reduce((acc, ts) => {
      const name = ts.employeeId?.name || 'Unknown';
      (acc[name] = acc[name] || []).push(ts);
      return acc;
    }, {});

    Object.entries(byEmp).forEach(([emp, entries]) => {
      entries.forEach((ts, i) => {
        ws.addRow({
          employee:      i === 0 ? emp : '',
          date:          ts.date,
          day:           moment(ts.date).format('dddd'),
          client:        ts.clientId?.name || '',
          project:       ts.projectId?.name || '',
          startTime:     ts.startTime,
          endTime:       ts.endTime,
          lunchBreak:    ts.lunchBreak || '',
          lunchDuration: ts.lunchDuration || '',
          leaveType:     ts.leaveType || '',
          description:   ts.description || '',
          hourlyWage:    ts.hourlyWage != null ? ts.hourlyWage : '',
          totalHours:    ts.totalHours != null ? ts.totalHours.toFixed(2) : '',
        });
      });
      ws.addRow([]);
    });

    // 4️⃣ Generate buffer
    const buffer = await workbook.xlsx.writeBuffer();

    // 5️⃣ Build a dynamic filename with names and date range
    const employeeNames = Array.from(new Set(localized.map(ts => ts.employeeId?.name || 'Unknown')));
    const nameLabel = employeeNames.length === 1
      ? employeeNames[0]
      : employeeNames.join('_');
    const startLabel = moment(startDate).format('YYYY-MM-DD');
    const endLabel   = moment(endDate).format('YYYY-MM-DD');
    const fileName = `${nameLabel}_Timesheet_${startLabel}_to_${endLabel}.xlsx`;

    res.setHeader(
      'Content-Type',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    );
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="${fileName}"; filename*=UTF-8''${encodeURIComponent(fileName)}`
    );

    return res.send(buffer);

  } catch (error) {
    console.error('Excel download error:', error);
    return res.status(500).json({ error: 'Failed to generate Excel file' });
  }
};


// Send email with timesheet

export const sendTimesheetEmail = async (req, res) => {
  const { email, employeeIds = [], startDate, endDate, timezone = 'Asia/Kolkata' } = req.body;
  console.log("Received email send request with filters:", { email, employeeIds, startDate, endDate });

  try {
    const filter = {};
    if (employeeIds.length > 0) {
      filter.employeeId = { $in: employeeIds };
    }
    if (startDate && endDate) {
      filter.date = {
        $gte: new Date(startDate),
        $lte: new Date(endDate),
      };
    }

    const timesheets = await Timesheet.find(filter)
      .populate("employeeId")
      .populate("clientId")
      .populate("projectId");

    if (!timesheets.length) {
      return res.status(400).json({ message: "No timesheets to send" });
    }

    const localizedTimesheets = timesheets.map(ts => convertTimesheetToLocal(ts, timezone));

    const groupedByEmployee = localizedTimesheets.reduce((acc, ts) => {
      const empName = ts.employeeId?.name || "Unknown";
      if (!acc[empName]) acc[empName] = [];
      acc[empName].push(ts);
      return acc;
    }, {});

    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet("Timesheets");
    worksheet.columns = [
      { header: "Full Name", key: "employee", width: 20 },
      { header: "Date", key: "date", width: 15 },
      { header: "Day", key: "day", width: 12 },
      { header: "Client", key: "client", width: 20 },
      { header: "Project", key: "project", width: 20 },
      { header: "Start", key: "startTime", width: 15 },
      { header: "End", key: "endTime", width: 15 },
      { header: "Lunch Break", key: "lunchBreak", width: 12 },
      { header: "Lunch Duration", key: "lunchDuration", width: 15 },
      { header: "Leave Type", key: "leaveType", width: 20 },
      { header: "Description", key: "description", width: 30 },
      { header: "Hourly Wage", key: "hourlyWage", width: 15 },
      { header: "Total Hours", key: "totalHours", width: 15 },
    ];

    for (const [employeeName, entries] of Object.entries(groupedByEmployee)) {
      entries.forEach((ts, index) => {
        worksheet.addRow({
          employee: index === 0 ? employeeName : '',
          date: ts.date,
          day: moment(ts.date).format("dddd"),
          client: ts.clientId?.name || '',
          project: ts.projectId?.name || '',
          startTime: ts.startTime,
          endTime: ts.endTime,
          lunchBreak: ts.lunchBreak || '',
          lunchDuration: ts.lunchDuration || '',
          leaveType: ts.leaveType || '',
          description: ts.description || '',
          hourlyWage: ts.hourlyWage != null ? ts.hourlyWage : '',
          totalHours: ts.totalHours != null ? ts.totalHours.toFixed(2) : '',
        });
      });
      worksheet.addRow({});
    }

    const buffer = await workbook.xlsx.writeBuffer();

    // Format the date range for the filename
    const formattedStartDate = moment(startDate).format('YYYY-MM-DD');
    const formattedEndDate = moment(endDate).format('YYYY-MM-DD');
    const fileName = `${Object.keys(groupedByEmployee).join('_')}_Timesheet_${formattedStartDate}_to_${formattedEndDate}.xlsx`;

    const transporter = nodemailer.createTransport({
      service: "gmail",
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS,
      },
    });

    const mailOptions = {
      from: process.env.EMAIL_USER,
      to: email,
      subject: "Filtered Timesheet Report",
      text: "Please find attached your filtered timesheet report.",
      attachments: [
        {
          filename: fileName,
          content: buffer,
        },
      ],
    };

    await transporter.sendMail(mailOptions);
    res.status(200).send({ message: "Timesheet sent successfully!" });
  } catch (error) {
    console.error("Error sending timesheet email:", error);
    res.status(500).send({ message: "Failed to send email. Please try again." });
  }
};

//  Download timesheets by project as Excel
export const downloadProjectTimesheets = async (req, res) => {
  try {
    const { projectIds = [], startDate, endDate, timezone = 'Asia/Kolkata' } = req.body;

    const filter = {};
    if (projectIds.length) filter.projectId = { $in: projectIds };
    if (startDate && endDate) filter.date = {
      $gte: new Date(startDate),
      $lte: new Date(endDate)
    };

    const timesheets = await Timesheet.find(filter)
      .populate('employeeId')
      .populate('clientId')
      .populate('projectId');

    if (!timesheets.length) {
      return res.status(404).json({ error: 'No timesheets found for the given filters' });
    }

    const localized = timesheets.map(ts => convertTimesheetToLocal(ts, timezone));

    const workbook = new ExcelJS.Workbook();
    const ws = workbook.addWorksheet('Project Timesheets');
    ws.columns = [
      { header: 'Project', key: 'project', width: 20 },
      { header: 'Full Name', key: 'employee', width: 20 },
      { header: 'Date', key: 'date', width: 15 },
      { header: 'Day', key: 'day', width: 12 },
      { header: 'Client', key: 'client', width: 20 },
      { header: 'Start', key: 'startTime', width: 15 },
      { header: 'End', key: 'endTime', width: 15 },
      { header: 'Lunch Break', key: 'lunchBreak', width: 12 },
      { header: 'Lunch Duration', key: 'lunchDuration', width: 15 },
      { header: 'Leave Type', key: 'leaveType', width: 20 },
      { header: 'Description', key: 'description', width: 30 },
      { header: 'Hourly Wage', key: 'hourlyWage', width: 15 },
      { header: 'Total Hours', key: 'totalHours', width: 15 },
    ];

    const byProject = localized.reduce((acc, ts) => {
      const projectName = ts.projectId?.name || 'Unknown';
      (acc[projectName] = acc[projectName] || []).push(ts);
      return acc;
    }, {});

    Object.entries(byProject).forEach(([project, entries]) => {
      entries.forEach((ts, i) => {
        ws.addRow({
          project: i === 0 ? project : '',
          employee: ts.employeeId?.name || '',
          date: ts.date,
          day: moment(ts.date).format('dddd'),
          client: ts.clientId?.name || '',
          startTime: ts.startTime,
          endTime: ts.endTime,
          lunchBreak: ts.lunchBreak || '',
          lunchDuration: ts.lunchDuration || '',
          leaveType: ts.leaveType || '',
          description: ts.description || '',
          hourlyWage: ts.hourlyWage != null ? ts.hourlyWage : '',
          totalHours: ts.totalHours != null ? ts.totalHours.toFixed(2) : '',
        });
      });
      ws.addRow([]);
    });

    const buffer = await workbook.xlsx.writeBuffer();
    const projectNames = Array.from(new Set(localized.map(ts => ts.projectId?.name || 'Unknown')));
    const nameLabel = projectNames.length === 1 ? projectNames[0] : projectNames.join('_');
    const startLabel = moment(startDate).format('YYYY-MM-DD');
    const endLabel = moment(endDate).format('YYYY-MM-DD');
    const fileName = `${nameLabel}_ProjectTimesheet_${startLabel}_to_${endLabel}.xlsx`;

    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename="${fileName}"; filename*=UTF-8''${encodeURIComponent(fileName)}`);
    return res.send(buffer);

  } catch (error) {
    console.error('Excel download error:', error);
    return res.status(500).json({ error: 'Failed to generate Excel file' });
  }
};


// Send project-based timesheet email
export const sendProjectTimesheetEmail = async (req, res) => {
  const { email, projectIds = [], startDate, endDate, timezone = 'Asia/Kolkata' } = req.body;
  try {
    const filter = {};
    if (projectIds.length) filter.projectId = { $in: projectIds };
    if (startDate && endDate) filter.date = {
      $gte: new Date(startDate),
      $lte: new Date(endDate),
    };

    const timesheets = await Timesheet.find(filter)
      .populate("employeeId")
      .populate("clientId")
      .populate("projectId");

    if (!timesheets.length) return res.status(400).json({ message: "No timesheets to send" });

    const localizedTimesheets = timesheets.map(ts => convertTimesheetToLocal(ts, timezone));
    const groupedByProject = localizedTimesheets.reduce((acc, ts) => {
      const projectName = ts.projectId?.name || "Unknown";
      (acc[projectName] = acc[projectName] || []).push(ts);
      return acc;
    }, {});

    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet("Project Timesheets");
    worksheet.columns = [
      { header: 'Project', key: 'project', width: 20 },
      { header: 'Full Name', key: 'employee', width: 20 },
      { header: 'Date', key: 'date', width: 15 },
      { header: 'Day', key: 'day', width: 12 },
      { header: 'Client', key: 'client', width: 20 },
      { header: 'Start', key: 'startTime', width: 15 },
      { header: 'End', key: 'endTime', width: 15 },
      { header: 'Lunch Break', key: 'lunchBreak', width: 12 },
      { header: 'Lunch Duration', key: 'lunchDuration', width: 15 },
      { header: 'Leave Type', key: 'leaveType', width: 20 },
      { header: 'Description', key: 'description', width: 30 },
      { header: 'Hourly Wage', key: 'hourlyWage', width: 15 },
      { header: 'Total Hours', key: 'totalHours', width: 15 },
    ];

    Object.entries(groupedByProject).forEach(([projectName, entries]) => {
      entries.forEach((ts, i) => {
        worksheet.addRow({
          project: i === 0 ? projectName : '',
          employee: ts.employeeId?.name || '',
          date: ts.date,
          day: moment(ts.date).format("dddd"),
          client: ts.clientId?.name || '',
          startTime: ts.startTime,
          endTime: ts.endTime,
          lunchBreak: ts.lunchBreak || '',
          lunchDuration: ts.lunchDuration || '',
          leaveType: ts.leaveType || '',
          description: ts.description || '',
          hourlyWage: ts.hourlyWage != null ? ts.hourlyWage : '',
          totalHours: ts.totalHours != null ? ts.totalHours.toFixed(2) : '',
        });
      });
      worksheet.addRow({});
    });

    const buffer = await workbook.xlsx.writeBuffer();
    const formattedStart = moment(startDate).format('YYYY-MM-DD');
    const formattedEnd = moment(endDate).format('YYYY-MM-DD');
    const fileName = `${Object.keys(groupedByProject).join('_')}_ProjectTimesheet_${formattedStart}_to_${formattedEnd}.xlsx`;

    const transporter = nodemailer.createTransport({
      service: "gmail",
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS,
      },
    });

    const mailOptions = {
      from: process.env.EMAIL_USER,
      to: email,
      subject: "Project Timesheet Report",
      text: "Please find attached the filtered project timesheet report.",
      attachments: [
        {
          filename: fileName,
          content: buffer,
        },
      ],
    };

    await transporter.sendMail(mailOptions);
    res.status(200).send({ message: "Project timesheet sent successfully!" });
  } catch (error) {
    console.error("Error sending project timesheet email:", error);
    res.status(500).send({ message: "Failed to send email. Please try again." });
  }
};