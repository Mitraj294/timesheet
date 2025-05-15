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

// --- Vehicle CRUD operations ---
// GET all vehicles - accessible to both authenticated employers and employees
router.get('/', protect, getVehicles);
// POST a new vehicle - only employers
router.post('/', protect, employerOnly, createVehicle); // Renamed from addVehicle if that was the intent
// GET a specific vehicle by ID - accessible to both authenticated employers and employees
router.get('/:id', protect, getVehicleById);
// PUT (update) a specific vehicle - only employers
router.put('/:id', protect, employerOnly, updateVehicle);
// DELETE a specific vehicle - only employers
router.delete('/:id', protect, employerOnly, deleteVehicle);

// --- Vehicle Review CRUD operations ---
// POST a new review for a specific vehicle - accessible to both authenticated employers and employees
// The controller (createVehicleReview) should handle associating the review with the vehicleId and logged-in user.
router.post('/:vehicleId/reviews', protect, createVehicleReview); // Changed route to be nested

// GET a specific review by its ID - accessible to both authenticated employers and employees
router.get('/reviews/:reviewId', protect, getReviewById);
// PUT (update) a specific review - accessible to authenticated users; controller must verify ownership or employer role
router.put('/reviews/:reviewId', protect, updateReview);
// DELETE a specific review - accessible to authenticated users; controller must verify ownership or employer role
router.delete('/reviews/:reviewId', protect, deleteReview);

// Get reviews associated with a specific vehicle
// Accessible to both authenticated employers and employees
router.get('/vehicle/:vehicleId/reviews', protect, getVehicleReviewsByVehicleId);
// This route seems redundant if getVehicleById can populate reviews, or if reviews are fetched separately.
// If kept, ensure it's also accessible to both roles if needed.
router.get('/vehicle-with-reviews/:vehicleId', protect, getVehicleWithReviews);

// --- Report routes - Typically employer-only ---
// Review Report routes (assuming these are employer-specific)
router.get('/reviews/:reviewId/download', protect, employerOnly, downloadReviewReport);
router.post('/reviews/:reviewId/send-email', protect, employerOnly, sendReviewReportByClient); // Matched controller function name

// All Vehicles Report routes
router.get('/report/all/download', protect, employerOnly, downloadAllVehiclesReport); // More consistent path
router.post('/report/all/send-email', protect, employerOnly, sendAllVehiclesReportByEmail); // More consistent path

// Single Vehicle Report routes
router.get('/:vehicleId/report/download', protect, employerOnly, downloadVehicleReport); // More consistent path
router.post('/:vehicleId/report/send-email', protect, employerOnly, sendVehicleReportByEmail); // More consistent path

export default router;
