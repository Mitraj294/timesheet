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
  sendTimesheetEmail,
  downloadProjectTimesheets,
  sendProjectTimesheetEmail
} from '../controllers/timesheetController.js';

const router = express.Router();

router.get('/', protect, getTimesheets);
router.post('/', protect, createTimesheet);
router.put('/:id', protect, updateTimesheet);
router.delete('/:id', protect, deleteTimesheet);

router.get('/check', protect, checkTimesheet); // Added protect middleware

router.get('/project/:projectId', protect, getTimesheetsByProject); // Added protect middleware
router.get('/employee/:employeeId', protect, getTimesheetsByEmployee); // Added protect middleware
router.get('/client/:clientId', protect, getTimesheetsByClient); // Added protect middleware

router.post('/download', protect, downloadTimesheets);
router.post('/send', protect, sendTimesheetEmail);
router.post('/download/project', protect, downloadProjectTimesheets);
router.post('/send-email/project', protect, sendProjectTimesheetEmail);

export default router;
