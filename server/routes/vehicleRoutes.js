import express from 'express';
import {
  getVehicles,
  getVehicleById,
  createVehicle,
  updateVehicle,
  deleteVehicle
} from '../controllers/vehicleController.js';

const router = express.Router();

router.get('/', getVehicles);


router.get('/:id', getVehicleById);


router.post('/', createVehicle);

router.put('/:id', updateVehicle);

router.delete('/:id', deleteVehicle);

export default router;
