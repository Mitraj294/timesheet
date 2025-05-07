import mongoose from 'mongoose';

const VehicleSchema = new mongoose.Schema({
  name: { type: String, required: true },
  hours: { type: String, required: true }, // Consider if this should be Number
  wofRego: { type: String },
  createdAt: { type: Date, default: Date.now },
});

export default mongoose.model('Vehicle', VehicleSchema);
