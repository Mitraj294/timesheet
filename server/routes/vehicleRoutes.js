import express from 'express';
import {
  getVehicles,
  getVehicleById,
  createVehicle,
  updateVehicle,
  deleteVehicle,
  createVehicleReview,
  getReviewById,
  getVehicleReviewsByVehicleId,
  getVehicleWithReviews,
  updateReview,
  deleteReview,
  downloadReviewReport,
  downloadVehicleReport,
  downloadAllVehiclesReport ,
  sendReviewReportByClient,
  sendVehicleReportByEmail,
  sendAllVehiclesReportByEmail
} from '../controllers/vehicleController.js'; // Assuming createVehicle is the correct add function
import { protect, employerOnly } from '../middleware/authMiddleware.js'; // Import middleware

const router = express.Router();

// Test route for vehicle API health check
router.get('/test', (req, res) => {
  res.send('Vehicle test route is working. Ensure you are authenticated if testing protected routes.');
});

// Apply protection and employerOnly middleware to all subsequent routes in this file
router.use(protect, employerOnly);

// Vehicle CRUD operations
router.get('/', getVehicles);
router.post('/', createVehicle); // Renamed from addVehicle if that was the intent
router.get('/:id', getVehicleById);
router.put('/:id', updateVehicle);
router.delete('/:id', deleteVehicle);

// Vehicle Review CRUD operations
router.post('/reviews', createVehicleReview);
router.get('/reviews/:reviewId', getReviewById);
router.put('/reviews/:reviewId', updateReview);
router.delete('/reviews/:reviewId', deleteReview);

// Get reviews associated with a specific vehicle
router.get('/vehicle/:vehicleId/reviews', getVehicleReviewsByVehicleId);
router.get('/vehicle-with-reviews/:vehicleId', getVehicleWithReviews);

// Review Report routes
router.get('/reviews/:reviewId/download', downloadReviewReport);
router.post('/reviews/:reviewId/send-email', sendReviewReportByClient); // Matched controller function name

// All Vehicles Report routes
router.get('/report/all/download', downloadAllVehiclesReport); // More consistent path
router.post('/report/all/send-email',  sendAllVehiclesReportByEmail); // More consistent path

// Single Vehicle Report routes
router.get('/:vehicleId/report/download', downloadVehicleReport); // More consistent path
router.post('/:vehicleId/report/send-email', sendVehicleReportByEmail); // More consistent path

export default router;
