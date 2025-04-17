import Timesheet from "../models/Timesheet.js";
import ExcelJS from 'exceljs';
import mongoose from "mongoose";
import moment from "moment-timezone";
import nodemailer from "nodemailer";

// Utility functions


const toUTC = (date, time, timezone) => {
  return moment.tz(`${date} ${time}`, "YYYY-MM-DD HH:mm", timezone).utc().toDate();
};

const toLocalTime = (utcTime, timezone) => {
  return moment(utcTime).tz(timezone).format("YYYY-MM-DD HH:mm A");
};


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

    const timesheets = await Timesheet.find()
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
    const timesheets = await Timesheet.find()
      .populate('employeeId')
      .populate('clientId')
      .populate('projectId');
    if (!timesheets || timesheets.length === 0) {
      return res.status(404).json({ error: 'No timesheets found' });
    }
    const groupedByEmployee = timesheets.reduce((acc, ts) => {
      const empName = ts.employeeId?.name || 'Unknown';
      if (!acc[empName]) acc[empName] = [];
      acc[empName].push(ts);
      return acc;
    }, {});
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('Timesheets');
    worksheet.columns = [
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
    for (const [employeeName, entries] of Object.entries(groupedByEmployee)) {
      entries.forEach((ts, index) => {
        worksheet.addRow({
          employee: index === 0 ? employeeName : '',
          date: ts.date ? new Date(ts.date).toISOString().substring(0, 10) : '', // yyyy-mm-dd
          day: ts.date ? new Date(ts.date).toLocaleDateString('en-GB', { weekday: 'long' }) : '',
          client: ts.clientId?.name || '',
          project: ts.projectId?.name || '',
          startTime: ts.startTime ? new Date(ts.startTime).toISOString().substring(11, 16) : '', // HH:mm
          endTime: ts.endTime ? new Date(ts.endTime).toISOString().substring(11, 16) : '',       // HH:mm
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
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', 'attachment; filename=timesheets.xlsx');
    await workbook.xlsx.write(res);
    res.end();
  } catch (error) {
    console.error('Excel download error:', error);
    res.status(500).json({ error: 'Failed to generate Excel file' });
  }
};


// Send email with timesheet


export const sendTimesheetEmail = async (req, res) => {
  const { email } = req.body;
  console.log("Received email send request with email:", email);

  try {
    // Fetch timesheets from the database
    const timesheets = await Timesheet.find()
      .populate("employeeId")
      .populate("clientId")
      .populate("projectId");

    if (!timesheets || timesheets.length === 0) {
      console.log("No timesheets available to send.");
      return res.status(400).json({ message: "No timesheets to send" });
    }

    // Group timesheets by employee
    const groupedByEmployee = timesheets.reduce((acc, ts) => {
      const empName = ts.employeeId?.name || "Unknown";
      if (!acc[empName]) acc[empName] = [];
      acc[empName].push(ts);
      return acc;
    }, {});

    // Create an Excel workbook with the timesheet data
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
          employee: index === 0 ? employeeName : "",
          date: ts.date ? new Date(ts.date).toISOString().substring(0, 10) : "",
          day: ts.date
            ? new Date(ts.date).toLocaleDateString("en-GB", { weekday: "long" })
            : "",
          client: ts.clientId?.name || "",
          project: ts.projectId?.name || "",
          startTime: ts.startTime
            ? new Date(ts.startTime).toISOString().substring(11, 16)
            : "",
          endTime: ts.endTime
            ? new Date(ts.endTime).toISOString().substring(11, 16)
            : "",
          lunchBreak: ts.lunchBreak || "",
          lunchDuration: ts.lunchDuration || "",
          leaveType: ts.leaveType || "",
          description: ts.description || "",
          hourlyWage: ts.hourlyWage != null ? ts.hourlyWage : "",
          totalHours: ts.totalHours != null ? ts.totalHours.toFixed(2) : "",
        });
      });
      worksheet.addRow({});
    }

    // Log a message indicating that Excel file generation succeeded
    console.log("Excel workbook generated successfully.");

    // Create email transporter
    const transporter = nodemailer.createTransport({
      service: "gmail",
      auth: {
        user: "your-email@gmail.com",
        pass: "your-email-password",
      },
    });

    // Prepare email options with the Excel file attached
    const buffer = await workbook.xlsx.writeBuffer();
    console.log("Excel workbook buffer length:", buffer.length);

    const mailOptions = {
      from: "your-email@gmail.com",
      to: email,
      subject: "Timesheet Report",
      text: "Here is your timesheet report attached.",
      html: `<p>Please find attached the timesheet report.</p>`,
      attachments: [
        {
          filename: "timesheets.xlsx",
          content: buffer,
        },
      ],
    };

    // Send the email with the attachment
    await transporter.sendMail(mailOptions);
    console.log("Email sent successfully.");
    res.status(200).send({ message: "Timesheet sent successfully!" });
  } catch (error) {
    console.error("Error sending timesheet email:", error);
    res.status(500).send({ message: "Failed to send email. Please try again." });
  }
};
