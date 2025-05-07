import mongoose from 'mongoose';


const VehicleReviewSchema = new mongoose.Schema({
  vehicle: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Vehicle',
    required: true,
  },
  dateReviewed: { type: Date, required: true },
  employeeId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Employee',
    required: true
  },
  oilChecked: { type: Boolean, default: false },
  vehicleChecked: { type: Boolean, default: false },
  vehicleBroken: { type: Boolean, default: false },
  notes: { type: String },
  hours: { type: Number },
  createdAt: { type: Date, default: Date.now },
});


export default mongoose.model('VehicleReview', VehicleReviewSchema);
