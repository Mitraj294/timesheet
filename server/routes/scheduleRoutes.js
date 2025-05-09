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

// DELETE /api/schedules/deleteByDateRange - Delete schedules within a date range (protected, employer only)
router.delete('/deleteByDateRange', protect, employerOnly, deleteByDateRange);

// PUT /api/schedules/:id - Update a specific schedule entry (protected, employer only)
router.put('/:id', protect, employerOnly, updateSchedule); 

// DELETE /api/schedules/:id - Delete a specific schedule entry (protected, employer only)
router.delete('/:id', protect, employerOnly, deleteSchedule);

export default router;