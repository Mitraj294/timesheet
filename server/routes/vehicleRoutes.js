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
} from '../controllers/vehicleController.js';


const router = express.Router();
console.log("vehicleRoutes loaded");

// Test route for vehicle API health check
router.get('/test', (req, res) => {
  res.send('Vehicle test route is working');
});

router.get('/', getVehicles);                      // GET all vehicles
router.get('/:id', getVehicleById);                // GET single vehicle by ID
router.post('/', createVehicle);                   // POST create vehicle
router.put('/:id', updateVehicle);                 // PUT update vehicle
router.delete('/:id', deleteVehicle);              // DELETE vehicle

// Review Routes
router.post('/reviews', createVehicleReview);      // POST create review
router.get('/reviews/:reviewId', getReviewById);     // GET review by review ID
router.put('/reviews/:reviewId', updateReview);      // PUT update review
router.delete('/reviews/:reviewId', deleteReview);   // DELETE review

router.get('/vehicle/:vehicleId/reviews', getVehicleReviewsByVehicleId); // GET all reviews for a vehicle
router.get('/vehicle-with-reviews/:vehicleId', getVehicleWithReviews);   // GET vehicle with reviews

// Download routes
router.get('/reviews/:reviewId/download', downloadReviewReport);
router.post('/reviews/report/email/:reviewId', sendReviewReportByClient);


router.get('/download/all', downloadAllVehiclesReport);



router.get('/:vehicleId/download-report', downloadVehicleReport);
router.post('/report/email/:vehicleId', sendVehicleReportByEmail);


router.post('/send-report',  sendAllVehiclesReportByEmail);

export default router;
