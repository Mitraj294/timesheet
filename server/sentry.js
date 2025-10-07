// sentry.js
import * as Sentry from '@sentry/node';
import config from './config/env.js';

// Only initialize Sentry if enabled and DSN is provided
const sentryEnabled = config.sentry.enabled && config.sentry.dsn;

if (sentryEnabled) {
  Sentry.init({
    dsn: config.sentry.dsn,
    environment: config.env,
    tracesSampleRate: config.sentry.tracesSampleRate,
    
    // Don't capture errors in test environment
    enabled: !config.isTest,
    
    // Sample rate for profiling (optional)
    profilesSampleRate: config.isProduction ? 0.1 : 1.0,
    
    // Additional options based on environment
    debug: config.isDevelopment,
    
    // Filter out sensitive data
    beforeSend(event, hint) {
      // Don't send events in test environment
      if (config.isTest) {
        return null;
      }
      
      // Remove sensitive data from error context
      if (event.request) {
        delete event.request.cookies;
        if (event.request.headers) {
          delete event.request.headers.authorization;
          delete event.request.headers.cookie;
        }
      }
      
      return event;
    },
  });
  
  console.log(`Sentry initialized (${config.env}, ${config.sentry.tracesSampleRate * 100}% sampling)`);
} else {
  console.log(`Sentry disabled for this environment`);
}

export { Sentry };
