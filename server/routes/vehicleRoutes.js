// vehicleRoutes.js
import express from 'express';
import {
  createVehicle,
  getVehicles,
  getVehicleById,
  updateVehicle,
  deleteVehicle,
  createVehicleReview,
  getReviewById,
  getVehicleReviewsByVehicleId,
  getVehicleWithReviews,
  deleteReview
} from '../controllers/vehicleController.js';

const router = express.Router();
console.log("✅ vehicleRoutes loaded");

// --- Vehicle Routes ---
router.get('/test', (req, res) => {
  res.send('✅ Vehicle test route is working');
});

router.get('/', getVehicles); // GET /api/vehicles
router.get('/:id', getVehicleById);
router.post('/', createVehicle);
router.put('/:id', updateVehicle);
router.delete('/:id', deleteVehicle);

// --- Vehicle Review Routes ---
router.post('/reviews', createVehicleReview);
router.get('/review/:reviewId', getReviewById);

router.get('/reviews/:vehicleId', getVehicleReviewsByVehicleId);
router.get('/vehicle-with-reviews/:vehicleId', getVehicleWithReviews);
router.delete('/reviews/:reviewId', deleteReview);

export default router;
