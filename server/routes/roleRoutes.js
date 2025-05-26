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

// POST /api/roles - Create a new role (protected, employer only)
router.post('/', protect, employerOnly, createRole);

// GET /api/roles - Get all roles (protected)
router.get('/', protect, getRoles);

// GET /api/roles/:id - Get a specific role by ID (protected)
router.get('/:id', protect, getRoleById);

// PUT /api/roles/:id - Update a specific role (protected, employer only)
router.put('/:id', protect, employerOnly, updateRole);  

// DELETE /api/roles/:id - Delete a specific role (protected, employer only)
router.delete('/:id', protect, employerOnly, deleteRole);

// DELETE /api/roles/:roleId/schedule/:scheduleId - Delete a specific schedule entry from a role (protected, employer only)
router.delete('/:roleId/schedule/:scheduleId', protect, employerOnly, deleteScheduleFromRole);

export default router;
