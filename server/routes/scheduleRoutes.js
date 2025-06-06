import express from 'express';
import {
  createBulkSchedules,
  getSchedulesByWeek,
  updateSchedule,
  deleteSchedule,
  deleteByDateRange
} from '../controllers/scheduleController.js';
import { protect, employerOnly } from '../middleware/authMiddleware.js';

const router = express.Router();

// Bulk create schedule entries (employer only)
router.post('/bulk', protect, employerOnly, createBulkSchedules);

// Get schedules for a week (any authenticated user)
router.get('/', protect, getSchedulesByWeek);

// Delete schedules in a date range (employer only)
router.delete('/deleteByDateRange', protect, employerOnly, deleteByDateRange);

// Update a schedule entry (employer only)
router.put('/:id', protect, employerOnly, updateSchedule);

// Delete a schedule entry (employer only)
router.delete('/:id', protect, employerOnly, deleteSchedule);

export default router;