import Schedule from '../models/Schedule.js';
import Employee from '../models/Employee.js'; // For fetching employerId for employee users
import mongoose from 'mongoose';
import { DateTime } from 'luxon';

// @desc    Create schedules in bulk
// @route   POST /api/schedules/bulk
// @access  Private (Employer)
export const createBulkSchedules = async (req, res) => {
  try {
    const schedules = req.body;
    const employerId = req.user._id; // Get employerId from authenticated user

    if (!Array.isArray(schedules) || schedules.length === 0) {
      return res.status(400).json({ message: 'No schedules provided' });
    }

    const schedulesToSave = schedules.map((sch) => {
      // Validate required fields from client payload for each schedule
      if (!sch.startTime || !sch.endTime || !sch.date || !sch.employee) {
        // Log the problematic schedule object for easier debugging
        console.error('Missing required fields in schedule object:', sch);
        // Throw an error that will be caught and result in a 400 or 500 response
        throw new Error(`Missing required fields for one or more schedules. Ensure employee, date, startTime, and endTime are provided.`);
      }

      // Convert the provided date (local) to UTC for storage
      const dateUTC = DateTime.fromISO(sch.date, { zone: 'local' }).toUTC().toJSDate();

      return {
        employerId: employerId, // Use authenticated employer's ID
        employee: new mongoose.Types.ObjectId(sch.employee),
        role: sch.role ? new mongoose.Types.ObjectId(sch.role) : null,
        startTime: sch.startTime,
        endTime: sch.endTime,
        date: dateUTC,
        timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
      };
    });

    const createdSchedules = await Schedule.insertMany(schedulesToSave);
    res.status(201).json(createdSchedules); // Return the created schedules
  } catch (err) {
    console.error('Error creating schedules:', err);
    if (err.message.startsWith('Missing required fields')) {
      return res.status(400).json({ message: err.message });
    }
    if (err.name === 'ValidationError') {
      return res.status(400).json({ message: err.message });
    }
    res.status(500).json({ message: 'Server error while creating schedules: ' + err.message });
  }
};

// @desc    Get schedules by week (converts to/from UTC for storage/retrieval)
// @route   GET /api/schedules
// @access  Private (Employer, Employee)
export const getSchedulesByWeek = async (req, res) => {
  try {
    const { weekStart } = req.query;

    if (!weekStart) {
      return res.status(400).json({ message: 'Missing weekStart parameter' });
    }

    let targetEmployerId;
    if (req.user.role === 'employer') {
      targetEmployerId = req.user._id;
    } else if (req.user.role === 'employee') {
      const employeeRecord = await Employee.findOne({ userId: req.user._id }).select('employerId').lean();
      if (!employeeRecord || !employeeRecord.employerId) {
        return res.status(404).json({ message: 'Employee record or associated employer not found for fetching schedules.' });
      }
      targetEmployerId = employeeRecord.employerId;
    } else {
      return res.status(403).json({ message: 'Forbidden: User role cannot access schedules.' });
    }

    if (!targetEmployerId) {
        return res.status(400).json({ message: 'Could not determine employer for fetching schedules.' });
    }

    // Convert weekStart to UTC range
    const startLocal = DateTime.fromISO(weekStart, { zone: 'local' }).startOf('day');
    const endLocal = startLocal.plus({ days: 6 }).endOf('day');
    const utcStart = startLocal.toUTC();
    const utcEnd = endLocal.toUTC();

    const query = {
      employerId: targetEmployerId,
      date: { $gte: utcStart.toJSDate(), $lte: utcEnd.toJSDate() },
    };

    const schedules = await Schedule.find(query)
      .populate('employee', 'name')
      .populate('role', 'roleName');

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
    console.error('Error fetching schedules:', err);
    res.status(500).json({ message: 'Failed to fetch schedules: ' + err.message });
  }
};

// @desc    Update a single schedule by ID
// @route   PUT /api/schedules/:id
// @access  Private (Employer)
export const updateSchedule = async (req, res) => {
  try {
    const { id } = req.params;
    const employerId = req.user._id;
    const updateData = req.body;

    // Prevent employerId from being changed via payload
    if (updateData.employerId) {
      delete updateData.employerId;
    }

    const schedule = await Schedule.findOne({ _id: id, employerId: employerId });
    if (!schedule) {
      // Check if schedule exists but doesn't belong to user, or if it doesn't exist at all
      const scheduleExists = await Schedule.findById(id);
      if (scheduleExists) {
        return res.status(403).json({ message: 'Forbidden: You do not own this schedule.' });
      }
      return res.status(404).json({ message: 'Schedule not found.' });
    }

    // Apply updates
    if (updateData.employee) schedule.employee = updateData.employee;
    if (updateData.hasOwnProperty('role')) schedule.role = updateData.role; // Allow setting role to null
    if (updateData.startTime) schedule.startTime = updateData.startTime;
    if (updateData.endTime) schedule.endTime = updateData.endTime;
    if (updateData.date) {
      schedule.date = DateTime.fromISO(updateData.date, { zone: 'local' }).toUTC().toJSDate();
    }
    // If startTime or endTime are updated, assume they are UTC, so timezone should be UTC
    if (updateData.startTime || updateData.endTime || updateData.date) {
        schedule.timezone = 'UTC';
    }

    const updatedSchedule = await schedule.save();

    res.status(200).json({ message: 'Schedule updated successfully', schedule: updatedSchedule });
  } catch (err) {
    console.error('Error updating schedule:', err);
    if (err.name === 'ValidationError') {
        return res.status(400).json({ message: err.message });
    }
    if (err.kind === 'ObjectId') {
        return res.status(404).json({ message: 'Schedule not found (invalid ID format)' });
    }
    res.status(500).json({ message: 'Failed to update schedule: ' + err.message });
  }
};

// @desc    Delete a schedule by ID
// @route   DELETE /api/schedules/:id
// @access  Private (Employer)
export const deleteSchedule = async (req, res) => {
  try {
    const { id } = req.params;
    const employerId = req.user._id;

    const deletedSchedule = await Schedule.findOneAndDelete({ _id: id, employerId: employerId });

    if (!deletedSchedule) {
      const scheduleExists = await Schedule.findById(id);
      if (scheduleExists) {
        return res.status(403).json({ message: 'Forbidden: You do not own this schedule.' });
      }
      return res.status(404).json({ message: 'Schedule not found.' });
    }

    res.status(200).json({ message: 'Schedule deleted successfully' });
  } catch (err) {
    console.error('Error deleting schedule:', err);
    if (err.kind === 'ObjectId') {
        return res.status(404).json({ message: 'Schedule not found (invalid ID format)' });
    }
    res.status(500).json({ message: 'Failed to delete schedule: ' + err.message });
  }
};

// @desc    Delete schedules by date range
// @route   DELETE /api/schedules/by-date-range
// @access  Private (Employer)
export const deleteByDateRange = async (req, res) => {
  try {
    const { startDate, endDate } = req.body;
    const employerId = req.user._id;

    if (!startDate || !endDate) {
      return res.status(400).json({ message: 'Start date and end date are required.' });
    }


    const result = await Schedule.deleteMany({
      employerId: employerId,
      date: {
        $gte: new Date(startDate),
        $lte: new Date(endDate)
      }
    });

    res.status(200).json({ message: `${result.deletedCount} schedules deleted successfully.` });
  } catch (err) {
    console.error('Error deleting schedules by date range:', err);
    res.status(500).json({ message: 'Failed to delete schedules by date range: ' + err.message });
  }
};
