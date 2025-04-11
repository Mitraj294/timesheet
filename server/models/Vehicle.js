// models/Vehicle.js
import mongoose from 'mongoose';

const VehicleSchema = new mongoose.Schema({
  name: { type: String, required: true },
  hours: { type: String, required: true }, // total hours or usage hours
  wofRego: { type: String },
  dateReviewed: { type: Date },
  employeeName: { type: String },
  oilChecked: { type: Boolean },
  vehicleChecked: { type: Boolean },
  vehicleBroken: { type: Boolean },
  notes: { type: String }, // for other notes like "Testing"

  createdAt: { type: Date, default: Date.now },
});

export default mongoose.model('Vehicle', VehicleSchema);
