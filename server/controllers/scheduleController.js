import Schedule from '../models/Schedule.js';
import mongoose from 'mongoose';
import { DateTime } from 'luxon';

// Create schedules in bulk
export const createBulkSchedules = async (req, res) => {
  try {
    const schedules = req.body;

    if (!Array.isArray(schedules) || schedules.length === 0) {
      return res.status(400).json({ message: 'No schedules provided' });
    }

    const schedulesToSave = schedules.map((sch) => {
      if (!sch.startTime || !sch.endTime || !sch.date || !sch.employee) {
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
    res.status(500).json({ message: err.message || 'Server error' });
  }
};

// Get schedules by week (based on local time)
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
// Update a single schedule by ID
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

// Delete schedule by ID
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
    console.error('Error deleting schedule:', err);
    res.status(500).json({ message: 'Failed to delete schedule' });
  }
};
