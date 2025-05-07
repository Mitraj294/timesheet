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

// POST /api/schedules/bulk - Bulk create schedule entries (protected, employer only)
router.post('/bulk', protect, employerOnly, createBulkSchedules);

// GET /api/schedules - Get schedules by week (protected)
router.get('/', protect, getSchedulesByWeek);

// DELETE /api/schedules/deleteByDateRange - Delete schedules within a date range (protected)
router.delete('/deleteByDateRange', protect, deleteByDateRange);

// PUT /api/schedules/:id - Update a specific schedule entry (protected)
router.put('/:id', protect, updateSchedule); 

// DELETE /api/schedules/:id - Delete a specific schedule entry (protected)
router.delete('/:id', protect, deleteSchedule);

export default router;