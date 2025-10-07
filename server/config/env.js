/**
 * Environment Configuration Loader
 * Loads the correct .env file based on NODE_ENV
 * and validates required variables
 */

import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Determine which .env file to load
const getEnvFile = () => {
  const env = process.env.NODE_ENV || 'development';
  
  switch (env) {
    case 'test':
      return '.env.test';
    case 'production':
      return '.env.production';
    case 'staging':
      return '.env.staging';
    case 'development':
    default:
      return '.env.development';
  }
};

// Load environment variables
const envFile = getEnvFile();
const envPath = path.resolve(__dirname, '..', envFile);

console.log(`Loading environment: ${process.env.NODE_ENV || 'development'}`);
console.log(`Config file: ${envFile}`);

const result = dotenv.config({ path: envPath });

if (result.error) {
  console.warn(`Warning: Could not load ${envFile}, falling back to .env`);
  dotenv.config({ path: path.resolve(__dirname, '..', '.env') });
}

// Required environment variables
const REQUIRED_VARS = [
  'MONGO_URI',
  'JWT_SECRET',
  'PORT',
];

// Optional but recommended variables
const RECOMMENDED_VARS = [
  'EMAIL_HOST',
  'EMAIL_PORT',
  'EMAIL_USER',
  'EMAIL_PASS',
  'SENTRY_DSN',
];

// Validate required variables
const validateEnv = () => {
  const missing = [];
  const recommended = [];

  REQUIRED_VARS.forEach(varName => {
    if (!process.env[varName]) {
      missing.push(varName);
    }
  });

  RECOMMENDED_VARS.forEach(varName => {
    if (!process.env[varName]) {
      recommended.push(varName);
    }
  });

  if (missing.length > 0) {
    console.error('Missing required environment variables:');
    missing.forEach(varName => console.error(`   - ${varName}`));
    throw new Error('Missing required environment variables');
  }

  if (recommended.length > 0 && process.env.NODE_ENV !== 'test') {
    console.warn('Missing recommended environment variables:');
    recommended.forEach(varName => console.warn(`   - ${varName}`));
  }
};

// Validate on load
try {
  validateEnv();
  console.log('Environment configuration loaded successfully\n');
} catch (error) {
  console.error('Environment configuration failed:', error.message);
  process.exit(1);
}

// Export environment-aware helpers
export const config = {
  env: process.env.NODE_ENV || 'development',
  isDevelopment: process.env.NODE_ENV === 'development',
  isProduction: process.env.NODE_ENV === 'production',
  isStaging: process.env.NODE_ENV === 'staging',
  isTest: process.env.NODE_ENV === 'test',
  
  // Database
  mongoUri: process.env.MONGO_URI,
  
  // Server
  port: parseInt(process.env.PORT, 10) || 5000,
  baseApiUrl: process.env.BASE_API_URL || '/api',
  clientBaseUrl: process.env.CLIENT_BASE_URL,
  
  // Security
  jwtSecret: process.env.JWT_SECRET,
  
  // Email
  email: {
    host: process.env.EMAIL_HOST,
    port: parseInt(process.env.EMAIL_PORT, 10) || 587,
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
    from: process.env.EMAIL_FROM || `"Timesheet App" <${process.env.EMAIL_USER}>`,
  },
  
  // Cron Jobs
  cron: {
    enabled: process.env.ENABLE_CRON_JOBS === 'true',
    weeklyReportSchedule: process.env.WEEKLY_REPORT_CRON_SCHEDULE || '00 19 * * 6',
    notificationSchedule: process.env.NOTIFICATION_SCHEDULER_CRON || '* * * * *',
    timezone: process.env.SERVER_TIMEZONE || 'Asia/Kolkata',
  },
  
  // Batch Processing
  batch: {
    maxNotificationsPerRun: parseInt(process.env.MAX_NOTIFICATIONS_PER_RUN, 10) || 500,
    notificationBatchSize: parseInt(process.env.NOTIFICATION_BATCH_SIZE, 10) || 10,
  },
  
  // Sentry
  sentry: {
    dsn: process.env.SENTRY_DSN,
    enabled: process.env.SENTRY_ENABLE === 'true',
    tracesSampleRate: parseFloat(process.env.SENTRY_TRACES_SAMPLE_RATE) || 0.1,
  },
  
  // Logging
  logging: {
    level: process.env.LOG_LEVEL || 'info',
    enableRequestLogging: process.env.ENABLE_REQUEST_LOGGING === 'true',
  },
};

export default config;
