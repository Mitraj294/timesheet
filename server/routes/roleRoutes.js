import express from 'express';
import {
  createRole,
  getRoles,
  getRoleById,
  updateRole,
  deleteRole,
  deleteScheduleFromRole 
} from '../controllers/roleController.js';
import { protect, employerOnly } from '../middleware/authMiddleware.js';

const router = express.Router();

// Create a new role (employer only)
router.post('/', protect, employerOnly, createRole);

// Get all roles for the employer or user
router.get('/', protect, getRoles);

// Get a specific role by ID
router.get('/:id', protect, getRoleById);

// Update a role (employer only)
router.put('/:id', protect, employerOnly, updateRole);

// Delete a role (employer only)
router.delete('/:id', protect, employerOnly, deleteRole);

// Remove a schedule entry from a role (employer only)
router.delete('/:roleId/schedule/:scheduleId', protect, employerOnly, deleteScheduleFromRole);

export default router;
