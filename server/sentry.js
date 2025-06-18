// sentry.js
import * as Sentry from '@sentry/node';

Sentry.init({
  dsn: process.env.SENTRY_DSN, // Set this in your .env file
  environment: process.env.NODE_ENV || 'development',
  tracesSampleRate: 1.0, // Adjust for production as needed
});

export { Sentry };
