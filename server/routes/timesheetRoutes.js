import express from 'express';
import { protect, employerOnly } from '../middleware/authMiddleware.js';
import {
  createTimesheet,
  getTimesheets,
  getTimesheetById, 
  checkTimesheet,
  getTimesheetsByProject,
  getTimesheetsByEmployee,
  getTimesheetsByClient,
  getIncompleteTimesheetsByEmployee, // Import the new controller function
  updateTimesheet,
  deleteTimesheet,
  downloadTimesheets ,
  sendTimesheetEmail,
  downloadProjectTimesheets,
  sendProjectTimesheetEmail
} from '../controllers/timesheetController.js';

const router = express.Router();

// Base timesheet routes
router.get('/', protect, getTimesheets);
router.post('/', protect, createTimesheet);

// Check for existing timesheet (MUST be before /:id route)
router.get('/check', protect, checkTimesheet);

router.route('/:id')
  .get(protect, getTimesheetById) 
  .put(protect, updateTimesheet)
  .delete(protect, deleteTimesheet);

// Get timesheets by specific criteria
router.get('/project/:projectId', protect, getTimesheetsByProject);
router.get('/employee/:employeeId', protect, getTimesheetsByEmployee);
router.get('/employee/:employeeId/incomplete', protect, getIncompleteTimesheetsByEmployee); // New route
router.get('/client/:clientId', protect, getTimesheetsByClient);

// Download and email general timesheet reports
router.post('/download', protect, employerOnly, downloadTimesheets);
router.post('/send', protect, employerOnly, sendTimesheetEmail);

// Download and email project-specific timesheet reports
router.post('/download/project', protect, employerOnly, downloadProjectTimesheets);
router.post('/send-email/project', protect, employerOnly, sendProjectTimesheetEmail);

export default router;
