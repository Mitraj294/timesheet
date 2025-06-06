import mongoose from "mongoose";

// Client schema: stores client info for an employer
const clientSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true }, // Client's name
  emailAddress: { type: String, required: true, unique: true, lowercase: true, trim: true }, // Must be unique
  phoneNumber: { type: String, required: true, trim: true },
  address: { type: String, trim: true },
  notes: { type: String, trim: true }, // Optional notes about the client
  isImportant: { type: Boolean, default: false }, // Mark client as important
  projects: [{ type: mongoose.Schema.Types.ObjectId, ref: "Project" }], // Related projects
  employerId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User', // Reference to employer (User)
    required: true,
  },
}, { timestamps: true }); // Adds createdAt and updatedAt

const Client = mongoose.model("Client", clientSchema);

export default Client;
