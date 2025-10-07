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
let clientRoutes, employeeRoutes, authRoutes, timesheetRoutes, projectRoutes, roleRoutes, scheduleRoutes, vehicleRoutes, userRoutes;
import { errorHandler } from './middleware/errorMiddleware.js';
import { sendWeeklyTimesheetReports } from './controllers/timesheetController.js';
let settingsRoutes;
import { startNotificationService } from './services/notificationService.js';
import * as Sentry from '@sentry/node';
import https from 'https';
import os from 'os';

// Load environment configuration first (handles .env loading and Sentry init)
import config from './config/env.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();

// Define allowed origins for CORS (environment-aware)
const allowedOrigins = [
  config.clientBaseUrl, // From environment config
  "https://timesheet00.netlify.app", // Production
  "https://timesheet-staging.netlify.app", // Staging (if exists)
  "https://192.168.1.63:3000", // Local dev
  "https://192.168.1.63:5000", // Local API
  /^https:\/\/deploy-preview-\d+--timesheet00\.netlify\.app$/, // Netlify previews
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
// Express 5 requires named wildcards: use '/{*splat}' to match all paths including root
app.options('/{*splat}', cors(corsOptions));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(helmet());
app.use(cookieParser());

// Import MongoDB connection from config (uses environment-aware settings)
import connectDB from './config/db.js';

// Always register routes, even in test mode (for supertest)
const BASE_API_URL = process.env.BASE_API_URL || "/api";

// Helper to safely mount routes
const safeMount = (mountPath, router) => {
  try {
    app.use(mountPath, router);
  } catch (err) {
    console.error(`Failed mounting: ${mountPath}`);
    console.error(err);
    throw err;
  }
};

// Import route modules
const importRoutes = async () => {
  try {
    clientRoutes = (await import('./routes/clientRoutes.js')).default;
    employeeRoutes = (await import('./routes/employeeRoutes.js')).default;
    authRoutes = (await import('./routes/authRoutes.js')).default;
    timesheetRoutes = (await import('./routes/timesheetRoutes.js')).default;
    projectRoutes = (await import('./routes/projectRoutes.js')).default;
    roleRoutes = (await import('./routes/roleRoutes.js')).default;
    scheduleRoutes = (await import('./routes/scheduleRoutes.js')).default;
    vehicleRoutes = (await import('./routes/vehicleRoutes.js')).default;
    settingsRoutes = (await import('./routes/settingsRoutes.js')).default;
    userRoutes = (await import('./routes/userRoutes.js')).default;
  } catch (err) {
    console.error('Failed importing routes');
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
        console.log(`Running weekly reports...`);
        sendWeeklyTimesheetReports();
      },
      {
        scheduled: true,
        timezone: serverTimezone,
      },
    );
  } else {
    console.error(`Invalid CRON pattern: "${weeklyReportSchedule}"`);
  }

  startNotificationService();

  // Global Error Handler
  app.use(errorHandler);

  // Server configuration (environment-aware)
  const PORT = config.port;

  // Only use HOST and HTTPS for local development
  let HOST;
  if (config.isDevelopment) {
    HOST = process.env.HOST || '0.0.0.0';
  }

  // Use HTTPS for local development only
  let sslOptions = null;
  if (config.isDevelopment) {
    const certPath = path.join(__dirname, '../key.pem');
    const keyPath = path.join(__dirname, '../cert.pem');
    
    if (fs.existsSync(certPath) && fs.existsSync(keyPath)) {
      sslOptions = {
        key: fs.readFileSync(certPath),
        cert: fs.readFileSync(keyPath),
      };
    } else {
      console.warn('SSL certificates not found, using HTTP');
    }
  }

  // Find the first non-internal IPv4 address (for local dev)
  const networkHost = os.networkInterfaces();  
  let networkIp = '0.0.0.0';
  for (const iface of Object.values(networkHost)) {
    for (const alias of iface) {
      if (alias.family === 'IPv4' && !alias.internal) {
        networkIp = alias.address;
        break;
      }
    }
    if (networkIp !== '0.0.0.0') break;
  }
  
  // Start server (HTTPS for local dev, HTTP for production)
  if (config.isDevelopment && sslOptions) {
    // Local development with HTTPS
    https.createServer(sslOptions, app).listen(PORT, '0.0.0.0', () => {
      console.log(`\n Server running in ${config.env} mode`);
      console.log(`Server: https://${networkIp}:${PORT}`);
      console.log(`Database: ${config.mongoUri.match(/\/([^?]+)/)?.[1] || 'connected'}\n`);
    });
  } else {
    // Production/Staging - HTTP (platform handles HTTPS)
    app.listen(PORT, () => {
      console.log(`\n Server running in ${config.env} mode`);
      console.log(`Server: http://0.0.0.0:${PORT}`);
      console.log(`Database: ${config.mongoUri.match(/\/([^?]+)/)?.[1] || 'connected'}\n`);
    });
  }
}

export default app;
