import express from 'express';
// Import your authentication middleware (protect, employerOnly)
import { protect, employerOnly } from '../middleware/authMiddleware.js'; 
// Import the controller functions you created
import { getEmployerSettings, updateEmployerSettings } from '../controllers/settingsController.js'; 

const router = express.Router();

// @route   GET /api/settings/employer
// @desc    Get settings for the logged-in employer
// @access  Private (Employer Only)
// Changed: Now accessible by any authenticated user (protect), controller will handle role logic.
router.get('/employer', protect, getEmployerSettings);

// @route   PUT /api/settings/employer
// @desc    Update settings for the logged-in employer
// @access  Private (Employer Only)
router.put('/employer', protect, employerOnly, updateEmployerSettings);

export default router;