// /home/digilab/timesheet/server/server.js
import express from "express";
import cors from "cors";
import https from 'https'; // Import HTTPS module
import fs from 'fs'; // Import File System module
import mongoose from "mongoose";
import helmet from "helmet";
import cookieParser from "cookie-parser";
import dotenv from "dotenv";
import cron from 'node-cron';
import path from 'path';
import { fileURLToPath } from 'url';

// Initialize environment variables
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.resolve(__dirname, '.env') }); // Load .env from the same directory as server.js

// Import Routes
import clientRoutes from "./routes/clientRoutes.js";
import employeeRoutes from "./routes/employeeRoutes.js";
import authRoutes from "./routes/authRoutes.js";
import timesheetRoutes from "./routes/timesheetRoutes.js";
import projectRoutes from "./routes/projectRoutes.js";
import roleRoutes from "./routes/roleRoutes.js";
import scheduleRoutes from "./routes/scheduleRoutes.js";
import vehicleRoutes from "./routes/vehicleRoutes.js";
// import notificationRoutes from './routes/notificationRoutes.js'; // - No longer needed
import { errorHandler } from './middleware/errorMiddleware.js';
import userRoutes from './routes/userRoutes.js';
import { sendWeeklyTimesheetReports } from './controllers/timesheetController.js';
import settingsRoutes from './routes/settingsRoutes.js'; // Import the new settings routes
import { startNotificationScheduler } from './scheduler/notificationScheduler.js'; // Import new notification scheduler

const app = express();

// Core Middleware
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
    console.log("Attempting to connect to MongoDB...");
    await mongoose.connect(process.env.MONGO_URI);
    console.log("MongoDB Connected Successfully.");
  } catch (error) {
    console.error("MongoDB Connection Error:", error.message);
    process.exit(1); // Exit process with failure
  }
};

connectDB();

// Use BASE_API_URL for all routes
const BASE_API_URL = process.env.BASE_API_URL || '/api';

app.use(`${BASE_API_URL}/clients`, clientRoutes);
app.use(`${BASE_API_URL}/employees`, employeeRoutes);
app.use(`${BASE_API_URL}/auth`, authRoutes);
app.use(`${BASE_API_URL}/timesheets`, timesheetRoutes);
app.use(`${BASE_API_URL}/projects`, projectRoutes);
app.use(`${BASE_API_URL}/roles`, roleRoutes);
app.use(`${BASE_API_URL}/schedules`, scheduleRoutes);
app.use(`${BASE_API_URL}/vehicles`, vehicleRoutes);
app.use(`${BASE_API_URL}/users`, userRoutes);
// app.use(`${BASE_API_URL}/notifications`, notificationRoutes); // - No longer needed
app.use(`${BASE_API_URL}/settings`, settingsRoutes);

// Root Route
app.get("/", (req, res) => {
  res.send("TimeSheet Backend is Running...");
});

// --- Schedulers ---

// CRON Pattern: 'minute hour day-of-month month day-of-week'
const weeklyReportSchedule = process.env.WEEKLY_REPORT_CRON_SCHEDULE || '00 19 * * 6'; // Default to Sat 7 PM if not set
const serverTimezone = process.env.SERVER_TIMEZONE || 'Asia/Kolkata';

if (cron.validate(weeklyReportSchedule)) {
  cron.schedule(weeklyReportSchedule, () => {
      console.log(`[Scheduler] Triggered: Running sendWeeklyTimesheetReports at ${new Date().toLocaleString()} (${serverTimezone})`);
      sendWeeklyTimesheetReports();
  }, {
      scheduled: true,
      timezone: serverTimezone
  });
  console.log(`[Scheduler] Weekly timesheet report job scheduled with pattern "${weeklyReportSchedule}" in timezone "${serverTimezone}".`);
} else {
  console.error(`[Scheduler] Invalid CRON pattern specified for weekly reports: "${weeklyReportSchedule}". Job not scheduled.`);
}

startNotificationScheduler();

// TODO: Uncomment and implement if lock screen cleanup is needed
// import { startLockScreenCleanupScheduler } from './scheduler/lockScreenCleanupScheduler.js';
// startLockScreenCleanupScheduler();

// Global Error Handler
// This should be the last piece of middleware before app.listen.
app.use(errorHandler);

// Start Server
const HOST = process.env.HOST || '192.168.1.47'; // Match your client .env or use 0.0.0.0
const PORT = process.env.PORT || 5000;

// SSL/TLS Certificate Options
// Assuming certs are in the parent directory of 'server' (i.e., in 'timesheet/')
const sslOptions = {
  key: fs.readFileSync(path.join(__dirname, '..', '192.168.1.47+3-key.pem')),
  cert: fs.readFileSync(path.join(__dirname, '..', '192.168.1.47+3.pem'))
};

// Create HTTPS server
https.createServer(sslOptions, app).listen(PORT, HOST, () => {
  console.log(`HTTPS Server successfully started on https://${HOST}:${PORT}`);
});

// Fallback for HTTP if needed (usually not for local dev with HTTPS)
// app.listen(PORT, HOST, () => console.log(`HTTP Server successfully started on http://${HOST}:${PORT}`));
