import Schedule from '../models/Schedule.js';
import { startOfWeek, endOfWeek } from 'date-fns';

export const getSchedules = async (req, res) => {
  try {
    const { weekStart } = req.query;
    const start = new Date(weekStart);
    const end = endOfWeek(start, { weekStartsOn: 1 }); // Monday–Sunday

    const schedules = await Schedule.find({
      date: { $gte: start, $lte: end }
    }).populate('employee', 'name').populate('role');

    res.status(200).json(schedules);
  } catch (err) {
    console.error('Get schedules error:', err);
    res.status(500).json({ message: 'Error fetching schedules' });
  }
};

export const createSchedulesBulk = async (req, res) => {
    try {
      const { schedules } = req.body;
  
      if (!Array.isArray(schedules) || schedules.length === 0) {
        return res.status(400).json({ message: 'No schedules provided' });
      }
  
      // Optional: Log what is coming
      console.log('Incoming schedules:', schedules);
  
      const saved = await Schedule.insertMany(schedules);
      res.status(201).json({ message: 'Schedules created', data: saved });
    } catch (err) {
      console.error('Bulk schedule creation error:', err.message, err.stack);
      res.status(500).json({ message: 'Error saving schedules', error: err.message });
    }
  };
  
