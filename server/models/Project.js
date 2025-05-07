import mongoose from "mongoose";

const ProjectSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true },
  startDate: { type: Date, default: null },
  finishDate: { type: Date, default: null },
  address: { type: String, trim: true, default: "" },
  expectedHours: { type: Number, min: 0, default: 0 },
  notes: { type: String, trim: true, default: "" },
  isImportant: { type: Boolean, default: false },
  status: {
    type: String,
    enum: ["Ongoing", "Completed"],
    default: "Ongoing"
  },
  clientId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Client",
    required: true
  },
}, { timestamps: true });

const Project = mongoose.model("Project", ProjectSchema);

export default Project;
