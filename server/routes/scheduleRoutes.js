import express from 'express';
import { getSchedules, createSchedulesBulk } from '../controllers/scheduleController.js';

const router = express.Router();

router.get('/', getSchedules);               // GET /api/schedules?weekStart=YYYY-MM-DD
router.post('/bulk', createSchedulesBulk);   // POST /api/schedules/bulk

export default router;
