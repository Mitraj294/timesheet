// models/Vehicle.js
import mongoose from 'mongoose';

const VehicleSchema = new mongoose.Schema({
  name: { type: String, required: true },
  hours: { type: String, required: true }, // total hours or usage hours
  wofRego: { type: String },
  createdAt: { type: Date, default: Date.now },
});

export default mongoose.model('Vehicle', VehicleSchema);
