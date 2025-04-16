import express from 'express';
import { protect, employerOnly } from '../middleware/authMiddleware.js';
import {
  createTimesheet,
  getTimesheets,
  checkTimesheet,
  getTimesheetsByProject,
  getTimesheetsByEmployee,
  getTimesheetsByClient,
  updateTimesheet,
  deleteTimesheet,
  downloadTimesheets ,
  sendTimesheetEmail
} from '../controllers/timesheetController.js';

const router = express.Router();

router.get('/', protect, getTimesheets);
router.post('/', protect, employerOnly, createTimesheet);
router.put('/:id', protect, employerOnly, updateTimesheet);
router.delete('/:id', protect, employerOnly, deleteTimesheet);

router.get('/check', checkTimesheet);

router.get('/project/:projectId', getTimesheetsByProject);
router.get('/employee/:employeeId', getTimesheetsByEmployee);
router.get('/client/:clientId', getTimesheetsByClient);

router.get('/download', downloadTimesheets);
router.post('/send', sendTimesheetEmail);
export default router;
