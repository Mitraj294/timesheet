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
// Route modules will be imported dynamically below so we can log and
// detect which module causes route-parsing errors during initialization.
let clientRoutes, employeeRoutes, authRoutes, timesheetRoutes, projectRoutes, roleRoutes, scheduleRoutes, vehicleRoutes;
import { errorHandler } from './middleware/errorMiddleware.js';
import userRoutes from './routes/userRoutes.js';
import { sendWeeklyTimesheetReports } from './controllers/timesheetController.js';
let settingsRoutes;
import { startNotificationService } from './services/notificationService.js';
import * as Sentry from '@sentry/node';
import https from 'https';
import os from 'os';

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
  "https://192.168.1.48:3000", // Allow frontend running on 192.168.1.48
  "https://localhost:3000", // Allow frontend running on localhost over HTTPS
  "http://localhost:3000", // Allow frontend running on localhost over HTTP (dev)
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
// Explicitly handle preflight OPTIONS requests so browsers receive CORS headers
app.options('*', cors(corsOptions));
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

// Helper to safely mount routes and log the mount path to help debug path-to-regexp errors
const safeMount = (mountPath, router) => {
  try {
    console.log(`[ROUTE] Mounting: ${mountPath}`);
    app.use(mountPath, router);
  } catch (err) {
    console.error(`[ROUTE ERROR] Failed mounting: ${mountPath}`);
    console.error(err);
    throw err; // rethrow so nodemon shows the stack trace
  }
};

// Log BASE_API_URL so we can confirm its runtime value (should be a path like '/api')
console.log('[DEBUG] BASE_API_URL =', BASE_API_URL);

// Dynamically import route modules and log progress so we can detect
// which module errors during initialization (path-to-regexp runs at import time).
const importRoutes = async () => {
  try {
    console.log('[ROUTE IMPORT] Importing clientRoutes');
    clientRoutes = (await import('./routes/clientRoutes.js')).default;
    console.log('[ROUTE IMPORT] Importing employeeRoutes');
    employeeRoutes = (await import('./routes/employeeRoutes.js')).default;
    console.log('[ROUTE IMPORT] Importing authRoutes');
    authRoutes = (await import('./routes/authRoutes.js')).default;
    console.log('[ROUTE IMPORT] Importing timesheetRoutes');
    timesheetRoutes = (await import('./routes/timesheetRoutes.js')).default;
    console.log('[ROUTE IMPORT] Importing projectRoutes');
    projectRoutes = (await import('./routes/projectRoutes.js')).default;
    console.log('[ROUTE IMPORT] Importing roleRoutes');
    roleRoutes = (await import('./routes/roleRoutes.js')).default;
    console.log('[ROUTE IMPORT] Importing scheduleRoutes');
    scheduleRoutes = (await import('./routes/scheduleRoutes.js')).default;
    console.log('[ROUTE IMPORT] Importing vehicleRoutes');
    vehicleRoutes = (await import('./routes/vehicleRoutes.js')).default;
    console.log('[ROUTE IMPORT] Importing settingsRoutes');
    settingsRoutes = (await import('./routes/settingsRoutes.js')).default;
    console.log('[ROUTE IMPORT] All route modules imported successfully');
  } catch (err) {
    console.error('[ROUTE IMPORT ERROR] Failed importing a route module');
    console.error(err);
    throw err;
  }
};

// Import routes synchronously at startup (top-level await is supported in ESM)
await importRoutes();

// Now mount routes
safeMount(`${BASE_API_URL}/clients`, clientRoutes);
safeMount(`${BASE_API_URL}/employees`, employeeRoutes);
safeMount(`${BASE_API_URL}/auth`, authRoutes);
safeMount(`${BASE_API_URL}/timesheets`, timesheetRoutes);
safeMount(`${BASE_API_URL}/projects`, projectRoutes);
safeMount(`${BASE_API_URL}/roles`, roleRoutes);
safeMount(`${BASE_API_URL}/schedules`, scheduleRoutes);
safeMount(`${BASE_API_URL}/vehicles`, vehicleRoutes);
safeMount(`${BASE_API_URL}/users`, userRoutes);
safeMount(`${BASE_API_URL}/settings`, settingsRoutes);

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

  // Use HTTPS for local development and allow access from network
  const sslOptions = {
    key: fs.readFileSync(path.join(__dirname, '../key.pem')),
    cert: fs.readFileSync(path.join(__dirname, '../cert.pem')),
  };
  const localHost = 'localhost';

const networkHost = os.networkInterfaces();  
  // Find the first non-internal IPv4 address
  let networkIp = 'localhost';
  for (const iface of Object.values(networkHost)) {
    for (const alias of iface) {
      if (alias.family === 'IPv4' && !alias.internal) {
        networkIp = alias.address;
        break;
      }
    }
    if (networkIp !== 'localhost') break;
  }
  https.createServer(sslOptions, app).listen(PORT, '0.0.0.0', () => {
    console.log('Server is running:');
    console.log(`  Local:            https://${localHost}:${PORT}`);
    console.log(`  On Your Network:  https://${networkIp}:${PORT}`);
  });
}

export default app;


