import Schedule from "../models/Schedule.js";
import Employee from "../models/Employee.js";
import mongoose from "mongoose";
import { DateTime } from "luxon";
import sendEmail, {
  sendScheduleAssignmentEmail,
  sendScheduleUpdateEmail,
} from "../services/emailService.js";

// Create schedules in bulk (employer only)
export const createBulkSchedules = async (req, res) => {
  try {
    const schedules = req.body;
    const employerId = req.user._id;
    if (!Array.isArray(schedules) || schedules.length === 0) {
      return res.status(400).json({ message: "No schedules provided" });
    }
    // Prepare schedules for DB
    const schedulesToSave = schedules.map((sch) => {
      if (!sch.startTime || !sch.endTime || !sch.date || !sch.employee) {
        // Missing required fields in schedule object
        throw new Error(
          `Missing required fields for one or more schedules. Ensure employee, date, startTime, and endTime are provided.`,
        );
      }
      // Store date as UTC
      const dateUTC = DateTime.fromISO(sch.date, { zone: "local" })
        .toUTC()
        .toJSDate();
      return {
        employerId,
        employee: new mongoose.Types.ObjectId(sch.employee),
        role: sch.role ? new mongoose.Types.ObjectId(sch.role) : null,
        startTime: sch.startTime,
        endTime: sch.endTime,
        date: dateUTC,
        timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
      };
    });

    const createdSchedules = await Schedule.insertMany(schedulesToSave);

    // Notify employees (one email per employee for all their new shifts)
    const employeeNotifications = {};
    for (const sch of createdSchedules) {
      const empId = sch.employee.toString();
      if (!employeeNotifications[empId]) {
        const employee = await Employee.findById(empId).populate(
          "userId",
          "email name",
        );
        if (employee && employee.userId && employee.userId.email) {
          employeeNotifications[empId] = {
            email: employee.userId.email,
            name: employee.userId.name,
            shifts: [],
          };
        }
      }
      if (employeeNotifications[empId]) {
        employeeNotifications[empId].shifts.push(
          `Date: ${DateTime.fromJSDate(sch.date).toLocal().toFormat("EEE, MMM d")}, Time: ${sch.startTime} - ${sch.endTime}`,
        );
      }
    }
    for (const empId in employeeNotifications) {
      const { email, name, shifts } = employeeNotifications[empId];
      await sendScheduleAssignmentEmail(email, name, shifts).catch(
        (emailError) =>
          console.error(
            `[ScheduleCtrl] Failed to send bulk schedule notification to ${email}:`,
            emailError,
          ),
      );
    }
    res.status(201).json(createdSchedules);
  } catch (err) {
    // If error is due to email config, send a clear message
    if (err.message && err.message.includes("Email functionality is disabled")) {
      return res.status(500).json({
        message: "Email notifications are currently disabled on the server. Please contact your administrator.",
      });
    }
    // Error creating schedules
    if (err.message.startsWith("Missing required fields")) {
      return res.status(400).json({ message: err.message });
    }
    if (err.name === "ValidationError") {
      return res.status(400).json({ message: err.message });
    }
    res.status(500).json({
      message: "Server error while creating schedules: " + err.message,
    });
  }
};

// Get schedules for a week (employer or employee)
export const getSchedulesByWeek = async (req, res) => {
  try {
    const { weekStart } = req.query;
    if (!weekStart) {
      return res.status(400).json({ message: "Missing weekStart parameter" });
    }
    let targetEmployerId;
    if (req.user.role === "employer") {
      targetEmployerId = req.user._id;
    } else if (req.user.role === "employee") {
      const employeeRecord = await Employee.findOne({ userId: req.user._id })
        .select("employerId")
        .lean();
      if (!employeeRecord || !employeeRecord.employerId) {
        return res.status(404).json({
          message:
            "Employee record or associated employer not found for fetching schedules.",
        });
      }
      targetEmployerId = employeeRecord.employerId;
    } else {
      return res
        .status(403)
        .json({ message: "Forbidden: User role cannot access schedules." });
    }
    if (!targetEmployerId) {
      return res.status(400).json({
        message: "Could not determine employer for fetching schedules.",
      });
    }
    // Calculate week range in UTC
    const startLocal = DateTime.fromISO(weekStart, { zone: "local" }).startOf(
      "day",
    );
    const endLocal = startLocal.plus({ days: 6 }).endOf("day");
    const utcStart = startLocal.toUTC();
    const utcEnd = endLocal.toUTC();
    const query = {
      employerId: targetEmployerId,
      date: { $gte: utcStart.toJSDate(), $lte: utcEnd.toJSDate() },
    };
    const schedules = await Schedule.find(query)
      .populate("employee", "name")
      .populate("role", "roleName");
    // Convert dates back to local for client
    const localSchedules = schedules.map((sch) => ({
      _id: sch._id,
      employee: sch.employee,
      role: sch.role,
      startTime: sch.startTime,
      endTime: sch.endTime,
      date: DateTime.fromJSDate(sch.date).toLocal().toISODate(),
      timezone: sch.timezone,
      createdAt: sch.createdAt,
      updatedAt: sch.updatedAt,
    }));
    res.status(200).json(localSchedules);
  } catch (err) {
    // Error fetching schedules
    res
      .status(500)
      .json({ message: "Failed to fetch schedules: " + err.message });
  }
};

// Update a schedule by ID (employer only)
export const updateSchedule = async (req, res) => {
  try {
    const { id } = req.params;
    const employerId = req.user._id;
    const updateData = req.body;
    if (updateData.employerId) {
      delete updateData.employerId;
    }
    const schedule = await Schedule.findOne({
      _id: id,
      employerId: employerId,
    });
    if (!schedule) {
      const scheduleExists = await Schedule.findById(id);
      if (scheduleExists) {
        return res
          .status(403)
          .json({ message: "Forbidden: You do not own this schedule." });
      }
      return res.status(404).json({ message: "Schedule not found." });
    }
    // Update fields
    if (updateData.employee) schedule.employee = updateData.employee;
    if (updateData.hasOwnProperty("role")) schedule.role = updateData.role;
    if (updateData.startTime) schedule.startTime = updateData.startTime;
    if (updateData.endTime) schedule.endTime = updateData.endTime;
    if (updateData.date) {
      schedule.date = DateTime.fromISO(updateData.date, { zone: "local" })
        .toUTC()
        .toJSDate();
    }
    if (updateData.startTime || updateData.endTime || updateData.date) {
      schedule.timezone = "UTC";
    }
    const updatedSchedule = await schedule.save();
    // Notify employee about update
    if (updatedSchedule.employee) {
      try {
        const employee = await Employee.findById(
          updatedSchedule.employee,
        ).populate("userId", "email name");
        if (employee && employee.userId && employee.userId.email) {
          await sendScheduleUpdateEmail(employee, updatedSchedule);
        }
      } catch (emailError) {
        console.error(
          `[ScheduleCtrl] Failed to send schedule update notification to employee ${updatedSchedule.employee}:`,
          emailError,
        );
      }
    }
    res.status(200).json({
      message: "Schedule updated successfully",
      schedule: updatedSchedule,
    });
  } catch (err) {
    // Error updating schedule
    if (err.name === "ValidationError") {
      return res.status(400).json({ message: err.message });
    }
    if (err.kind === "ObjectId") {
      return res
        .status(404)
        .json({ message: "Schedule not found (invalid ID format)" });
    }
    res
      .status(500)
      .json({ message: "Failed to update schedule: " + err.message });
  }
};

// Delete a schedule by ID (employer only)
export const deleteSchedule = async (req, res) => {
  try {
    const { id } = req.params;
    const employerId = req.user._id;
    const deletedSchedule = await Schedule.findOneAndDelete({
      _id: id,
      employerId: employerId,
    });
    if (!deletedSchedule) {
      const scheduleExists = await Schedule.findById(id);
      if (scheduleExists) {
        return res
          .status(403)
          .json({ message: "Forbidden: You do not own this schedule." });
      }
      return res.status(404).json({ message: "Schedule not found." });
    }
    res.status(200).json({ message: "Schedule deleted successfully" });
  } catch (err) {
    // Error deleting schedule
    if (err.kind === "ObjectId") {
      return res
        .status(404)
        .json({ message: "Schedule not found (invalid ID format)" });
    }
    res
      .status(500)
      .json({ message: "Failed to delete schedule: " + err.message });
  }
};

// Delete schedules by date range (employer only)
export const deleteByDateRange = async (req, res) => {
  try {
    const { startDate, endDate } = req.body;
    const employerId = req.user._id;
    if (!startDate || !endDate) {
      return res
        .status(400)
        .json({ message: "Start date and end date are required." });
    }
    const result = await Schedule.deleteMany({
      employerId: employerId,
      date: {
        $gte: new Date(startDate),
        $lte: new Date(endDate),
      },
    });
    res.status(200).json({
      message: `${result.deletedCount} schedules deleted successfully.`,
    });
  } catch (err) {
    // Error deleting schedules by date range
    res.status(500).json({
      message: "Failed to delete schedules by date range: " + err.message,
    });
  }
};
