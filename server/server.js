// /home/digilab/timesheet/server/server.js
import express from "express";
import cors from "cors";
import mongoose from "mongoose";
import helmet from "helmet";
import cookieParser from "cookie-parser";
import dotenv from "dotenv";
import cron from 'node-cron';
import https from 'https'; // Import HTTPS module
import fs from 'fs'; // Import File System module
import path from 'path';
import { fileURLToPath } from 'url';

console.log(`[Server Startup] Initial process.env.NODE_ENV: ${process.env.NODE_ENV}`);

// Initialize environment variables
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
// Make sure .env path is correct if server.js is run from a different CWD by nodemon
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

console.log(`[Server Startup] process.env.NODE_ENV after dotenv: ${process.env.NODE_ENV}`);
const app = express();

// Define allowed origins for CORS
const allowedOrigins = [
  'https://timesheet00.netlify.app', // Your Netlify production site
  /^https:\/\/[a-zA-Z0-9-]+--timesheet00\.netlify\.app$/, // Regex for Netlify deploy previews
  'https://192.168.1.47:3000', // Your local HTTPS client
  'http://192.168.1.47:3000',  // Local HTTP client (if you switch back and server is HTTP)
  'http://localhost:3000',     // Common local HTTP client
  'https://192.168.1.47:5000'  // Allow backend's own origin for proxy scenarios
];

const corsOptions = {
  origin: function (origin, callback) {
    console.log(`[CORS] Incoming request origin: ${origin}`); // Log the received origin
    if (!origin || allowedOrigins.some(allowedOrigin => {
      if (allowedOrigin instanceof RegExp) {
        return allowedOrigin.test(origin);
      }
      return allowedOrigin === origin;
    })) {
      console.log(`[CORS] Origin allowed: ${origin || 'No Origin (likely same-origin or server-to-server)'}`);
      callback(null, true);
    } else {
      console.error(`[CORS] Origin REJECTED: ${origin}. Not in allowed list:`, allowedOrigins);
      callback(new Error('Not allowed by CORS')); // Reject
    }
  },
  credentials: true // If you need to handle cookies or authorization headers
};

// Core Middleware
app.use(cors(corsOptions));
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
const PORT = process.env.PORT || 5000;
const HOST = process.env.HOST || '0.0.0.0'; // Listen on all available interfaces by default

if (process.env.NODE_ENV !== 'development') { // Changed condition
  // In production (like on Render), Render handles SSL termination.
  // The app should listen on HTTP via the port Render provides.
  app.listen(PORT, HOST, () => console.log(`HTTP Server successfully started in production on http://${HOST}:${PORT}`));
} else {
  // In development, run on HTTPS.
  // You'll need to generate self-signed certificates (key.pem, cert.pem)
  // and place them in the 'server' directory or update paths.
  const keyPath = path.resolve(__dirname, '../key.pem'); // Corrected path to root
  const certPath = path.resolve(__dirname, '../cert.pem'); // Corrected path to root

  console.log(`[Server Startup] Attempting to load SSL key from: ${keyPath}`);
  console.log(`[Server Startup] Attempting to load SSL cert from: ${certPath}`);

  let keyFile, certFile;
  try {
    keyFile = fs.readFileSync(keyPath);
    console.log(`[Server Startup] SSL key file loaded successfully. Length: ${keyFile.length}`);
  } catch (e) {
    console.error(`[Server Startup] FAILED to read SSL key file at ${keyPath}: ${e.message}`);
    process.exit(1); // Exit if key can't be read
  }

  try {
    certFile = fs.readFileSync(certPath);
    console.log(`[Server Startup] SSL cert file loaded successfully. Length: ${certFile.length}`);
  } catch (e) {
    console.error(`[Server Startup] FAILED to read SSL cert file at ${certPath}: ${e.message}`);
    process.exit(1); // Exit if cert can't be read
  }

  const options = {
    key: keyFile,
    cert: certFile
  };

  https.createServer(options, app).listen(PORT, HOST, () => {
    const listenHost = HOST === '0.0.0.0' ? '192.168.1.47' : HOST; // Use your specific IP for the log
    console.log(`HTTPS Server successfully started in development on https://${listenHost}:${PORT} (listening on ${HOST})`);
    console.log('Make sure you have generated key.pem and cert.pem in the server directory.');
    console.log('If you see this message but the server isn\'t accessible via HTTPS, check your certificate paths and generation.');
  });
}