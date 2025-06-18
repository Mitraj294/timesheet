import path from 'path';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import express from 'express';
import cors from 'cors';
import mongoose from 'mongoose';
import helmet from 'helmet';
import cookieParser from 'cookie-parser';
import cron from 'node-cron';
import fs from 'fs';
import container from './container.js';
import { scopePerRequest } from 'awilix-express';
import clientRoutes from './routes/clientRoutes.js';
import employeeRoutes from './routes/employeeRoutes.js';
import authRoutes from './routes/authRoutes.js';
import timesheetRoutes from './routes/timesheetRoutes.js';
import projectRoutes from './routes/projectRoutes.js';
import roleRoutes from './routes/roleRoutes.js';
import scheduleRoutes from './routes/scheduleRoutes.js';
import vehicleRoutes from './routes/vehicleRoutes.js';
import { errorHandler } from './middleware/errorMiddleware.js';
import userRoutes from './routes/userRoutes.js';
import { sendWeeklyTimesheetReports } from './controllers/timesheetController.js';
import settingsRoutes from './routes/settingsRoutes.js';
import { startNotificationService } from './services/notificationService.js';
import * as Sentry from '@sentry/node';

// Initialize Sentry before using its handlers
Sentry.init({
  dsn: process.env.SENTRY_DSN || '', // Set your DSN in .env
  tracesSampleRate: 1.0, // Adjust as needed
});

// Load correct .env for E2E
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
if (process.env.NODE_ENV === 'test') {
  dotenv.config({ path: path.join(__dirname, '../.env.e2e') });
} else {
  dotenv.config({ path: path.join(__dirname, '../.env') });
}

console.log('[EMAIL CONFIG CHECK]');
console.log('EMAIL_HOST:', process.env.EMAIL_HOST);
console.log('EMAIL_PORT:', process.env.EMAIL_PORT);
console.log('EMAIL_USER:', process.env.EMAIL_USER);
console.log('EMAIL_PASS:', process.env.EMAIL_PASS ? '(set)' : '(not set)');
if (!process.env.EMAIL_HOST || !process.env.EMAIL_PORT || !process.env.EMAIL_USER || !process.env.EMAIL_PASS) {
  console.error('[EMAIL CONFIG CHECK] One or more email config variables are missing!');
} else {
  console.log('[EMAIL CONFIG CHECK] All email config variables are present.');
}

// Simplify logs to only include critical information
console.log('Server is starting...');

// Only check email config after dotenv.config()
const emailConfig = {
  host: process.env.EMAIL_HOST,
  port: process.env.EMAIL_PORT,
  user: process.env.EMAIL_USER,
  pass: process.env.EMAIL_PASS,
};

if (!emailConfig.host || !emailConfig.port || !emailConfig.user || !emailConfig.pass) {
  console.error('Error: Missing or invalid email configuration. Please check your .env file.');
} else {
  console.log('Email configuration loaded successfully:', emailConfig);
}

const app = express();

// Define allowed origins for CORS
const allowedOrigins = [
  "https://timesheet00.netlify.app", // Your Netlify production site
  /^https:\/\/[a-zA-Z0-9-]+--timesheet00\.netlify\.app$/, // Regex for Netlify deploy previews
  "https://192.168.1.47:3000", // Your local HTTPS client
  "https://192.168.1.47:3000", // Local HTTP client
  "https://192.168.1.47:5000", // Allow backend's own origin for proxy scenarios
  "https://192.168.1.47:5000", // Allow backend's own origin for HTTP
  // For local dev, allow all origins (uncomment next line if needed)
  // '*',
];

const corsOptions = {
  origin: function (origin, callback) {
    if (!origin) {
      // Allow non-browser requests like curl, Postman, etc.
      callback(null, true);
      return;
    }
    if (
      allowedOrigins.some((allowedOrigin) => {
        if (allowedOrigin instanceof RegExp) {
          return allowedOrigin.test(origin);
        }
        return allowedOrigin === origin;
      })
    ) {
      callback(null, true);
    } else {
      console.error(`[CORS] Blocked origin: ${origin}`); // Log the blocked origin
      callback(new Error("Not allowed by CORS")); // Reject
    }
  },
  credentials: true, // If you need to handle cookies or authorization headers
};

// Core Middleware
app.use(scopePerRequest(container));
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
    await mongoose.connect(process.env.MONGO_URI);
  } catch (error) {
    console.error("MongoDB Connection Error:", error.message);
    process.exit(1); // Exit process with failure
  }
};

// Always register routes, even in test mode (for supertest)
const BASE_API_URL = process.env.BASE_API_URL || "/api";
app.use(`${BASE_API_URL}/clients`, clientRoutes);
app.use(`${BASE_API_URL}/employees`, employeeRoutes);
app.use(`${BASE_API_URL}/auth`, authRoutes);
app.use(`${BASE_API_URL}/timesheets`, timesheetRoutes);
app.use(`${BASE_API_URL}/projects`, projectRoutes);
app.use(`${BASE_API_URL}/roles`, roleRoutes);
app.use(`${BASE_API_URL}/schedules`, scheduleRoutes);
app.use(`${BASE_API_URL}/vehicles`, vehicleRoutes);
app.use(`${BASE_API_URL}/users`, userRoutes);
app.use(`${BASE_API_URL}/settings`, settingsRoutes);

// Add this route temporarily for testing Sentry in production
app.get('/sentry-test', (req, res, next) => {
  next(new Error('Sentry production test error!'));
});

// Root Route
app.get("/", (req, res) => {
  res.send("TimeSheet Backend is Running...");
});

// Only connect to DB and start server if run directly
if (process.env.JEST_WORKER_ID === undefined && process.env.NODE_ENV !== 'test' && import.meta.url === `file://${process.argv[1]}`) {
  connectDB();

  // --- Schedulers ---

  // CRON Pattern: 'minute hour day-of-month month day-of-week'
  const weeklyReportSchedule =
    process.env.WEEKLY_REPORT_CRON_SCHEDULE || "00 19 * * 6"; // Default to Sat 7 PM if not set
  const serverTimezone = process.env.SERVER_TIMEZONE || "Asia/Kolkata";

  if (cron.validate(weeklyReportSchedule)) {
    cron.schedule(
      weeklyReportSchedule,
      () => {
        console.log(
          `[Scheduler] Triggered: Running sendWeeklyTimesheetReports at ${new Date().toLocaleString()} (${serverTimezone})`,
        );
        sendWeeklyTimesheetReports();
      },
      {
        scheduled: true,
        timezone: serverTimezone,
      },
    );
    console.log(
      `[Scheduler] Weekly timesheet report job scheduled with pattern "${weeklyReportSchedule}" in timezone "${serverTimezone}".`,
    );
  } else {
    console.error(
      `[Scheduler] Invalid CRON pattern specified for weekly reports: "${weeklyReportSchedule}". Job not scheduled.`,
    );
  }

  startNotificationService();

  // Global Error Handler
  app.use(errorHandler);

  // Remove HTTPS/SSL config for production; let Render/Netlify handle HTTPS
  // Use .env for local, but always use process.env.PORT for production (Render)
  const PORT = process.env.PORT || 5000;

  // Only use HOST for local development, not in production
  let HOST;
  if (process.env.NODE_ENV === 'development') {
    HOST = process.env.HOST || '0.0.0.0';
  }

  // Use correct app.listen for environment
  if (process.env.NODE_ENV === 'development' && HOST) {
    app.listen(PORT, HOST, () => {
      console.log(`Server is running on http://${HOST}:${PORT}`);
    });
  } else {
    app.listen(PORT, () => {
      console.log(`Server is running on port ${PORT}`);
    });
  }
}

export default app;


