import mongoose from 'mongoose';

const VehicleSchema = new mongoose.Schema({
  name: { type: String, required: true },
  hours: { type: String, required: true },
  wofRego: { type: String },
  createdAt: { type: Date, default: Date.now },
});

export default mongoose.model('Vehicle', VehicleSchema);
