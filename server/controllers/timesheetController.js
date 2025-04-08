import Timesheet from "../models/Timesheet.js";

import mongoose from "mongoose";
import moment from "moment-timezone";

//  Utility functions
const toUTC = (date, time, timezone) => {
  const localTime = moment.tz(`${date} ${time}`, "YYYY-MM-DD HH:mm", timezone);
  return localTime.utc().toDate();
};

const toLocalTime = (utcTime, timezone) => {
  return moment(utcTime).tz(timezone).format("YYYY-MM-DD HH:mm A");
};

const calculateTotalHours = (startTime, endTime, lunchBreak, lunchDuration) => {
  const start = moment(startTime);
  const end = moment(endTime);
  let totalHours = end.diff(start, "minutes") / 60;

  if (lunchBreak === "Yes" && lunchDuration) {
    const [hours, minutes] = lunchDuration.split(":").map(Number);
    totalHours -= hours + minutes / 60;
  }

  return Math.max(0, totalHours);
};

//  Create a new timesheet
export const createTimesheet = async (req, res) => {
  try {
    const { employeeId, clientId, projectId, date, startTime, endTime, lunchBreak, lunchDuration, leaveType, timezone = "UTC" } = req.body;

    let utcStartTime = null;
    let utcEndTime = null;
    let totalHours = 0;

    if (leaveType === "None") {
      if (!mongoose.Types.ObjectId.isValid(clientId) || !mongoose.Types.ObjectId.isValid(projectId)) {
        return res.status(400).json({ message: "Invalid Client or Project ID" });
      }

      utcStartTime = toUTC(date, startTime, timezone);
      utcEndTime = toUTC(date, endTime, timezone);
      totalHours = calculateTotalHours(utcStartTime, utcEndTime, lunchBreak, lunchDuration);
    }

    const newTimesheet = new Timesheet({
      employeeId,
      clientId: leaveType === "None" ? clientId : null,
      projectId: leaveType === "None" ? projectId : null,
      date: new Date(date),
      startTime: utcStartTime,
      endTime: utcEndTime,
      lunchBreak: leaveType === "None" ? lunchBreak : "No",
      lunchDuration: leaveType === "None" ? lunchDuration : "00:00",
      leaveType,
      totalHours,
    });

    const savedTimesheet = await newTimesheet.save();
    res.status(201).json({ message: "Timesheet created successfully", data: savedTimesheet });

  } catch (error) {
    console.error("Error creating timesheet:", error);
    res.status(400).json({ message: "Error creating timesheet", error });
  }
};

// Check Timesheett
export const checkTimesheet = async (req, res) => {

  const { employee, date } = req.query;

  if (!employee || !date) {
    return res.status(400).json({ error: 'Missing employee or date' });
  }

  try {
    const startOfDay = new Date(date);
    startOfDay.setUTCHours(0, 0, 0, 0);

    const endOfDay = new Date(date);
    endOfDay.setUTCHours(23, 59, 59, 999);

    const existing = await Timesheet.findOne({
      employeeId: employee,
      date: { $gte: startOfDay, $lte: endOfDay },
    });

    if (existing) {
      return res.json({ exists: true, timesheet: existing });
    } else {
      return res.json({ exists: false });
    }
  } catch (err) {
    console.error('Error checking timesheet:', err);
    return res.status(500).json({ error: 'Server error' });
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

    if (!timesheets.length) {
      return res.status(404).json({ message: "No timesheets found" });
    }

    const timesheetsWithLocalTime = timesheets.map((t) => ({
      ...t._doc,
      startTime: toLocalTime(t.startTime, timezone),
      endTime: toLocalTime(t.endTime, timezone),
      date: moment(t.date).tz(timezone).format("YYYY-MM-DD"),
    }));

    const totalHours = timesheets.reduce((sum, t) => sum + (t.totalHours || 0), 0);
    const avgHours = timesheets.length ? (totalHours / timesheets.length).toFixed(1) : 0;

    res.json({ timesheets: timesheetsWithLocalTime, totalHours, avgHours });

  } catch (error) {
    console.error("Error fetching timesheets:", error);
    res.status(500).json({ message: error.message });
  }
};

//  Update a timesheet
export const updateTimesheet = async (req, res) => {
  try {
    const timesheet = await Timesheet.findById(req.params.id);
    if (!timesheet) return res.status(404).json({ message: "Timesheet not found" });

    const { date, startTime, endTime, lunchBreak, lunchDuration, clientId, projectId, timezone = "UTC" } = req.body;

    if (!mongoose.Types.ObjectId.isValid(clientId) || !mongoose.Types.ObjectId.isValid(projectId)) {
      return res.status(400).json({ message: "Invalid Client or Project ID" });
    }

    const utcStartTime = toUTC(date, startTime, timezone);
    const utcEndTime = toUTC(date, endTime, timezone);
    const totalHours = calculateTotalHours(utcStartTime, utcEndTime, lunchBreak, lunchDuration);

    Object.assign(timesheet, {
      date: new Date(date),
      startTime: utcStartTime,
      endTime: utcEndTime,
      lunchBreak,
      lunchDuration,
      clientId,
      projectId,
      totalHours,
    });

    await timesheet.save();
    res.json({ message: "Timesheet updated successfully", timesheet });

  } catch (error) {
    console.error("Error updating timesheet:", error);
    res.status(400).json({ message: "Error updating timesheet", error });
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

    const timesheetsWithLocalTime = timesheets.map((t) => ({
      ...t._doc,
      startTime: toLocalTime(t.startTime, timezone),
      endTime: toLocalTime(t.endTime, timezone),
      date: moment(t.date).tz(timezone).format("YYYY-MM-DD"),
    }));

    const totalHours = timesheets.reduce((sum, t) => sum + (t.totalHours || 0), 0);
    const avgHours = timesheets.length ? (totalHours / timesheets.length).toFixed(1) : 0;

    res.json({ timesheets: timesheetsWithLocalTime, totalHours, avgHours });

  } catch (error) {
    console.error("Error fetching timesheets by project:", error);
    res.status(500).json({ message: "Internal Server Error", error: error.message });
  }
};

// Get timesheets by employeeId only
export const getTimesheetsByEmployee = async (req, res) => {
  try {
    const { employeeId } = req.params;
    const { timezone = "UTC" } = req.query;

    if (!mongoose.Types.ObjectId.isValid(employeeId)) {
      return res.status(400).json({ message: "Invalid Employee ID" });
    }

    const employeeObjectId = new mongoose.Types.ObjectId(employeeId);
    console.log("Fetching timesheets for employee:", employeeObjectId);

    const timesheets = await Timesheet.find({ employeeId: employeeObjectId })
      .populate("clientId", "name emailAddress")
      .populate("projectId", "name startDate finishDate")
      .sort({ createdAt: -1 });

    if (!timesheets.length) {
      return res.status(404).json({ message: "No timesheets found for this employee" });
    }

    const timesheetsWithLocalTime = timesheets.map((t) => ({
      ...t._doc,
      startTime: toLocalTime(t.startTime, timezone),
      endTime: toLocalTime(t.endTime, timezone),
      date: moment(t.date).tz(timezone).format("YYYY-MM-DD"),
    }));

    const totalHours = timesheets.reduce((sum, t) => sum + (t.totalHours || 0), 0);
    const avgHours = timesheets.length ? (totalHours / timesheets.length).toFixed(1) : 0;

    res.json({ timesheets: timesheetsWithLocalTime, totalHours, avgHours });

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

    const timesheetsWithLocalTime = timesheets.map((t) => ({
      ...t._doc,
      startTime: toLocalTime(t.startTime, timezone),
      endTime: toLocalTime(t.endTime, timezone),
      date: moment(t.date).tz(timezone).format("YYYY-MM-DD"),
    }));

    const totalHours = timesheets.reduce((sum, t) => sum + (t.totalHours || 0), 0);
    const avgHours = timesheets.length ? (totalHours / timesheets.length).toFixed(1) : 0;

    res.json({ timesheets: timesheetsWithLocalTime, totalHours, avgHours });

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