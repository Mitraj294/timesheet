import express from 'express';
import {
  getVehicles,
  getVehicleById,
  createVehicle,
  updateVehicle,
  deleteVehicle
} from '../controllers/vehicleController.js';
import auth from '../middleware/authMiddleware.js';

const router = express.Router();

router.get('/', auth, getVehicles);
router.get('/:id', auth, getVehicleById);
router.post('/', auth, createVehicle);
router.put('/:id', auth, updateVehicle);
router.delete('/:id', auth, deleteVehicle);

export default router;
