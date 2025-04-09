import express from 'express';
import {
  createRole,
  getRoles,
  getRoleById,
  updateRole,
  deleteRole,
} from '../controllers/roleController.js';
import { protect, employerOnly } from '../middleware/authMiddleware.js';

const router = express.Router();

router.post('/', protect, employerOnly, createRole);
router.get('/', protect, getRoles);
router.get('/:id', protect, getRoleById);
router.put('/:id', protect, employerOnly, updateRole);  
router.delete('/:id', protect, employerOnly, deleteRole);

export default router;
