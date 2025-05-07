import Schedule from '../models/Schedule.js';
import mongoose from 'mongoose';
import { DateTime } from 'luxon';

// @desc    Create schedules in bulk
// @route   POST /api/schedules/bulk
// @access  Private (e.g.,  Employer/Employee)
export const createBulkSchedules = async (req, res) => {
  try {
    const schedules = req.body;

    if (!Array.isArray(schedules) || schedules.length === 0) {
      return res.status(400).json({ message: 'No schedules provided' });
    }

    const schedulesToSave = schedules.map((sch) => {
      if (!sch.startTime || !sch.endTime || !sch.date || !sch.employee) {
        // This error will be caught by the main catch block and result in a 500.
        throw new Error('Missing required schedule fields');
      }

      // Convert the provided date (local) to UTC for storage
      const dateUTC = DateTime.fromISO(sch.date, { zone: 'local' }).toUTC().toJSDate();

      return {
        employee: new mongoose.Types.ObjectId(sch.employee),
        role: sch.role ? new mongoose.Types.ObjectId(sch.role) : null,
        
        startTime: sch.startTime,
        endTime: sch.endTime,
        date: dateUTC,
        timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
      };
    });

    await Schedule.insertMany(schedulesToSave);
    res.status(201).json({ message: 'Schedules created successfully' });
  } catch (err) {
    console.error('Error creating schedules:', err);
    // If the error is due to "Missing required fields", a 400 might be more appropriate.
    // However, for a generic server error:
    res.status(500).json({ message: 'Server error while creating schedules' });
  }
};

// @desc    Get schedules by week (converts to/from UTC for storage/retrieval)
// @route   GET /api/schedules/week
// @access  Private (e.g.,  Employer/Employee or relevant Employees)
export const getSchedulesByWeek = async (req, res) => {
  try {
    const { weekStart } = req.query;

    if (!weekStart) {
      return res.status(400).json({ message: 'Missing weekStart parameter' });
    }

    // Convert weekStart to UTC range
    const startLocal = DateTime.fromISO(weekStart, { zone: 'local' }).startOf('day');
    const endLocal = startLocal.plus({ days: 6 }).endOf('day');
    const utcStart = startLocal.toUTC();
    const utcEnd = endLocal.toUTC();

    const schedules = await Schedule.find({
      date: { $gte: utcStart.toJSDate(), $lte: utcEnd.toJSDate() },
    })
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
    res.status(500).json({ message: 'Failed to fetch schedules' });
  }
};

// @desc    Update a single schedule by ID
// @route   PUT /api/schedules/:id
// @access  Private (e.g.,  Employer/Employee)
export const updateSchedule = async (req, res) => {
  try {
    const { id } = req.params;
    const { employee, role, startTime, endTime, date } = req.body;

    const schedule = await Schedule.findById(id);
    if (!schedule) {
      return res.status(404).json({ message: 'Schedule not found' });
    }

    schedule.employee = employee || schedule.employee;
    schedule.role = role || schedule.role;
    schedule.startTime = startTime || schedule.startTime;
    schedule.endTime = endTime || schedule.endTime;
    schedule.date = DateTime.fromISO(date, { zone: 'local' }).toUTC().toJSDate();
    schedule.timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;

    await schedule.save();

    res.status(200).json({ message: 'Schedule updated successfully', schedule });
  } catch (err) {
    console.error('Error updating schedule:', err);
    res.status(500).json({ message: 'Failed to update schedule' });
  }
};

// @desc    Delete a schedule by ID
// @route   DELETE /api/schedules/:id
// @access  Private (e.g.,  Employer/Employee)
export const deleteSchedule = async (req, res) => {
  try {
    const { id } = req.params;
    const deleted = await Schedule.findByIdAndDelete(id);

    if (!deleted) {
      return res.status(404).json({ message: 'Schedule not found' });
    }

    res.status(200).json({ message: 'Schedule deleted successfully' });
  } catch (err) {
    console.error('Error deleting schedule:', err);
    res.status(500).json({ message: 'Failed to delete schedule' });
  }
};

// @desc    Delete schedules by date range
// @route   DELETE /api/schedules/by-date-range
// @access  Private (e.g.,  Employer/Employee)
export const deleteByDateRange = async (req, res) => {
  try {
    const { startDate, endDate } = req.body;

    if (!startDate || !endDate) {
      return res.status(400).json({ message: 'Start date and end date are required.' });
    }


    const result = await Schedule.deleteMany({
      date: {
        $gte: new Date(startDate),
        $lte: new Date(endDate)
      }
    });

    res.status(200).json({ message: `${result.deletedCount} schedules deleted.` });
  } catch (err) {
    console.error('Error deleting schedules by date range:', err);
    res.status(500).json({ message: 'Failed to delete schedules by date range' });
  }
};
