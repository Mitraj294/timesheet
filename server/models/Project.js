import mongoose from "mongoose";

// Project schema: stores info about a project for a client
const ProjectSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true }, // Project name
  startDate: { type: Date, default: null }, // When project starts
  finishDate: { type: Date, default: null }, // When project ends
  address: { type: String, trim: true, default: "" }, // Project location
  expectedHours: { type: Number, min: 0, default: 0 }, // Estimated hours
  notes: { type: String, trim: true, default: "" }, // Extra info
  isImportant: { type: Boolean, default: false }, // Mark as important
  status: {
    type: String,
    enum: ["Ongoing", "Completed"], // Project status
    default: "Ongoing"
  },
  clientId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Client", // Link to client
    required: true
  },
}, { timestamps: true }); // Adds createdAt and updatedAt

const Project = mongoose.model("Project", ProjectSchema);

export default Project;
