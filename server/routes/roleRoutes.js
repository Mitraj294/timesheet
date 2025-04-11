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

router.post('/', protect, employerOnly, createRole);
router.get('/', protect, getRoles);
router.get('/:id', protect, getRoleById);
router.put('/:id', protect, employerOnly, updateRole);  
router.delete('/:id', protect, employerOnly, deleteRole);
router.delete('/:roleId/schedule/:scheduleId', protect, employerOnly, deleteScheduleFromRole);

export default router;
