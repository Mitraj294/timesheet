import mongoose from "mongoose";

const clientSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true },
  emailAddress: { type: String, required: true, unique: true, lowercase: true, trim: true },
  phoneNumber: { type: String, required: true, trim: true },
  address: { type: String, trim: true },
  notes: { type: String, trim: true },
  isImportant: { type: Boolean, default: false },
  projects: [{ type: mongoose.Schema.Types.ObjectId, ref: "Project" }], // Array of associated project IDs
  employerId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User', // Assuming your User model (where employers are stored) is named 'User'
    required: true,
  },
}, { timestamps: true });

const Client = mongoose.model("Client", clientSchema);

export default Client;
