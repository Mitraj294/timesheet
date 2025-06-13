import express from "express";
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
  downloadAllVehiclesReport,
  sendReviewReportByClient,
  sendVehicleReportByEmail,
  sendAllVehiclesReportByEmail,
} from "../controllers/vehicleController.js";
import { protect, employerOnly } from "../middleware/authMiddleware.js";

const router = express.Router();

// Health check for vehicle API
router.get("/test", (req, res) => {
  res.send(
    "Vehicle test route is working. You must be authenticated for protected routes.",
  );
});

// --- Move review routes above generic /:id routes ---

// Vehicle Review CRUD
router.post("/:vehicleId/reviews", protect, createVehicleReview); // Add review to vehicle
router.get("/reviews/:reviewId", protect, getReviewById); // Get review by ID
router.put("/reviews/:reviewId", protect, updateReview); // Update review (ownership/employer checked in controller)
router.delete("/reviews/:reviewId", protect, deleteReview); // Delete review (ownership/employer checked in controller)

// Get all reviews for a vehicle
router.get(
  "/vehicle/:vehicleId/reviews",
  protect,
  getVehicleReviewsByVehicleId,
);

// Get vehicle with all its reviews
router.get("/vehicle-with-reviews/:vehicleId", protect, getVehicleWithReviews);

// Report routes (employer only)
router.get(
  "/reviews/:reviewId/download",
  protect,
  employerOnly,
  downloadReviewReport,
); // Download single review report
router.post(
  "/reviews/:reviewId/send-email",
  protect,
  employerOnly,
  sendReviewReportByClient,
); // Email single review report

router.get(
  "/report/all/download",
  protect,
  employerOnly,
  downloadAllVehiclesReport,
); // Download all vehicles report
router.post(
  "/report/all/send-email",
  protect,
  employerOnly,
  sendAllVehiclesReportByEmail,
); // Email all vehicles report

router.get(
  "/:vehicleId/report/download",
  protect,
  employerOnly,
  downloadVehicleReport,
); // Download single vehicle report
router.post(
  "/:vehicleId/report/send-email",
  protect,
  employerOnly,
  sendVehicleReportByEmail,
); // Email single vehicle report

// --- Place generic vehicle routes after all /reviews routes ---

// Vehicle CRUD
router.get("/", protect, getVehicles); // Get all vehicles (employer/employee)
router.post("/", protect, employerOnly, createVehicle); // Add new vehicle (employer only)
router.get("/:id", protect, getVehicleById); // Get vehicle by ID
router.put("/:id", protect, employerOnly, updateVehicle); // Update vehicle (employer only)
router.delete("/:id", protect, employerOnly, deleteVehicle); // Delete vehicle (employer only)

export default router;
