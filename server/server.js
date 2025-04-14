import express from "express";
import cors from "cors";
import mongoose from "mongoose";
import helmet from "helmet";
import cookieParser from "cookie-parser";
import dotenv from "dotenv";

// Initialize environment variables
dotenv.config();

// Import Routes
import clientRoutes from "./routes/clientRoutes.js";
import employeeRoutes from "./routes/employeeRoutes.js";
import authRoutes from "./routes/authRoutes.js";
import timesheetRoutes from "./routes/timesheetRoutes.js";
import projectRoutes from "./routes/projectRoutes.js";
import roleRoutes from "./routes/roleRoutes.js";
import scheduleRoutes from "./routes/scheduleRoutes.js";
import vehicleRoutes from "./routes/vehicleRoutes.js"; // This now handles both vehicle and vehicle review routes

const app = express();

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(helmet());
app.use(cookieParser());

// MongoDB Connection
const connectDB = async () => {
  try {
    if (!process.env.MONGO_URI) {
      console.error("MONGO_URI is missing in .env file!");
      process.exit(1);
    }
    await mongoose.connect(process.env.MONGO_URI);
    console.log("MongoDB Connected...");
  } catch (error) {
    console.error("MongoDB Connection Error:", error.message);
    process.exit(1);
  }
};
connectDB();

// Routes
app.use("/api/clients", clientRoutes);
app.use("/api/employees", employeeRoutes);
app.use("/api/auth", authRoutes);
app.use("/api/timesheets", timesheetRoutes);
app.use("/api/projects", projectRoutes);
app.use("/api/roles", roleRoutes);
app.use("/api/schedules", scheduleRoutes);
app.use("/api/vehicles", vehicleRoutes); // Now handles both vehicle and vehicle review routes

// Root Route
app.get("/", (req, res) => {
  res.send("TimeSheet Backend is Running...");
});

// Global Error Handler
app.use((err, req, res, next) => {
  console.error("Error:", err.stack);
  res.status(500).json({ message: "Something went wrong. Please try again." });
});

// Start Server
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
