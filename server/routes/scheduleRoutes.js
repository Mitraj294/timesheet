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

router.post('/bulk', protect, employerOnly, createBulkSchedules);
router.get('/', protect, getSchedulesByWeek);
router.delete('/deleteByDateRange', protect, deleteByDateRange);
router.put('/:id', protect, updateSchedule); 
router.delete('/:id', protect, deleteSchedule);

export default router;