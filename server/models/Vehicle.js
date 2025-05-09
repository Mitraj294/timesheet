import mongoose from 'mongoose';

const VehicleSchema = new mongoose.Schema({
  name: { type: String, required: true },
  hours: { type: Number, required: true, min: 0 }, // Changed to Number, added min validation
  wofRego: { type: String }, // Stands for Warrant of Fitness and Registration
  employerId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User', // Assuming your User model is named 'User'
    required: true,
  },
  createdAt: { type: Date, default: Date.now },
});

export default mongoose.model('Vehicle', VehicleSchema);
