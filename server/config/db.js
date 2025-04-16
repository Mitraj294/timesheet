import mongoose from "mongoose";
import dotenv from "dotenv";

dotenv.config();

const connectDB = async () => {
  try {
    if (!process.env.MONGO_URI) {
      console.error("MONGO_URI is missing in .env file!");
      process.exit(1);
    }
    console.log(`Connecting to MongoDB at ${process.env.MONGO_URI}`); // Add this line
    await mongoose.connect(process.env.MONGO_URI);
    console.log("MongoDB Connected...>>>>>>");
  } catch (error) {
    console.error("MongoDB Connection Error:", error.message);
    process.exit(1);
  }
};

export default connectDB;
