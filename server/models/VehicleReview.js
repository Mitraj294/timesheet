import mongoose from 'mongoose';

// Vehicle Review schema definition
const VehicleReviewSchema = new mongoose.Schema({
  vehicle: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Vehicle',  // Reference to the Vehicle model
    required: true,
  },
  dateReviewed: { type: Date, required: true },
  employeeId: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'Employee',  // Reference to the Employee model
    required: true 
  },
  oilChecked: { type: Boolean, default: false },
  vehicleChecked: { type: Boolean, default: false },
  vehicleBroken: { type: Boolean, default: false },
  notes: { type: String },
  hours: { type: Number }, // Optional but useful
  createdAt: { type: Date, default: Date.now },
});

// Model export
export default mongoose.model('VehicleReview', VehicleReviewSchema);
