import express from "express";
import cors from "cors";
import mongoose from "mongoose";
import helmet from "helmet";
import dotenv from "dotenv";
dotenv.config();

import clientRoutes from "./routes/clientRoutes.js";
import employeeRoutes from "./routes/employeeRoutes.js"; 
import authRoutes from "./routes/authRoutes.js";
import timesheetRoutes from "./routes/timesheetRoutes.js";
import projectRoutes from "./routes/projectRoutes.js";  


const app = express();
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(helmet());

// Check if MongoDB URI exists
if (!process.env.MONGO_URI) {
  console.error("MONGO_URI is missing in .env file!");
  process.exit(1);
}

// Connect MongoDB
const connectDB = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    console.log("MongoDB Connected...");
  } catch (error) {
    console.error("MongoDB Connection Error:", error);
    process.exit(1);
  }
};
connectDB();

// API Routes

app.use("/api/clients", clientRoutes);
app.use("/api/employees", employeeRoutes);
app.use("/api/auth", authRoutes);
app.use("/api/timesheets", timesheetRoutes);
app.use("/api/projects", projectRoutes);




// Basic Route
app.get("/", (req, res) => {
  res.send("TimeSheet Backend is Running...");
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err);
  res.status(500).json({ message: "Something went wrong, please try again." });
});

// Start Server
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
