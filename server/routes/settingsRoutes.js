import express from 'express';
// Import your authentication middleware (assuming path from previous context)
import { protect, employerOnly } from '../middleware/authMiddleware.js'; 
// Import the controller functions
import { getEmployerSettings, updateEmployerSettings } from '../controllers/settingsController.js'; 

const router = express.Router();

// @route   GET /api/settings/employer
// @desc    Get settings for the logged-in employer or the employer of the logged-in employee
// @access  Private (Authenticated User)
router.get('/employer', protect, getEmployerSettings);

// @route   PUT /api/settings/employer
// @desc    Update settings for the logged-in employer
// @access  Private (Employer Only)
router.put('/employer', protect, employerOnly, updateEmployerSettings);

export default router;
