import mongoose from "mongoose";
import dotenv from "dotenv";

// Load environment variables from .env file
dotenv.config();

// Asynchronously connect to MongoDB.
const connectDB = async () => {
  try {
    // Ensure MONGO_URI is defined in the environment variables.
    if (!process.env.MONGO_URI) {
      console.error("Error: MONGO_URI is not defined in the .env file.");
      process.exit(1);
    }
    // Log the connection attempt (excluding sensitive parts of the URI if necessary in a real production scenario).
    console.log(`Attempting to connect to MongoDB...`);
    await mongoose.connect(process.env.MONGO_URI);
    console.log("MongoDB Connected Successfully.");
  } catch (error) {
    console.error("MongoDB Connection Error:", error.message);
    process.exit(1); // Exit process with failure
  }
};

export default connectDB;
