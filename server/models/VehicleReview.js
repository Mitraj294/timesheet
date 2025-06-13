import mongoose from "mongoose";

// VehicleReview schema: stores a review/check for a vehicle
const VehicleReviewSchema = new mongoose.Schema({
  vehicle: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Vehicle", // Which vehicle was reviewed
    required: true,
    index: true,
  },
  dateReviewed: { type: Date, required: true, index: true }, // When review was done
  employeeId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Employee", // Who did the review
    required: true,
    index: true,
  },
  oilChecked: { type: Boolean, default: false }, // Was oil checked?
  vehicleChecked: { type: Boolean, default: false }, // Was vehicle checked?
  vehicleBroken: { type: Boolean, default: false, index: true }, // Is vehicle broken?
  notes: { type: String }, // Extra notes
  hours: { type: Number }, // Hours on vehicle at review
  createdAt: { type: Date, default: Date.now }, // When review was created
}, { autoIndex: process.env.NODE_ENV !== 'production' });

export default mongoose.model("VehicleReview", VehicleReviewSchema);
