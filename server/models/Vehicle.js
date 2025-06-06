import mongoose from 'mongoose';

// Vehicle schema: stores info about a vehicle owned by an employer
const VehicleSchema = new mongoose.Schema({
  name: { type: String, required: true }, // Vehicle name
  hours: { type: Number, required: true, min: 0 }, // Usage hours (must be >= 0)
  wofRego: { type: String }, // Warrant of Fitness/Registration info
  employerId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User', // Owner (employer)
    required: true,
  },
  createdAt: { type: Date, default: Date.now }, // When vehicle was added
});

export default mongoose.model('Vehicle', VehicleSchema);
