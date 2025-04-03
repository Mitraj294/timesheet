import mongoose from "mongoose";

const clientSchema = new mongoose.Schema({
  name: { type: String, required: true },
  emailAddress: { type: String, required: true, unique: true },
  phoneNumber: { type: String, required: true },
  address: { type: String },
  notes: { type: String },
  isImportant: { type: Boolean, default: false },
  projects: [{ type: mongoose.Schema.Types.ObjectId, ref: "Project" }], 
});

const Client = mongoose.model("Client", clientSchema);

export default Client;
