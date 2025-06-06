import express from 'express';
import { protect, employerOnly } from '../middleware/authMiddleware.js'; 
import { getEmployerSettings, updateEmployerSettings } from '../controllers/settingsController.js'; 

const router = express.Router();

// Get settings for the current employer or the employer of the logged-in employee
router.get('/employer', protect, getEmployerSettings);

// Update settings (employer only)
router.put('/employer', protect, employerOnly, updateEmployerSettings);

export default router;
