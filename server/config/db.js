import mongoose from "mongoose";
import config from "./env.js";

// Connect to MongoDB with environment-specific settings
const connectDB = async () => {
  try {
    if (!config.mongoUri) {
      console.error("MONGO_URI not set in environment");
      process.exit(1);
    }
    
    // Environment-specific connection options
    const options = {
      // Disable auto-indexing in production for performance
      autoIndex: !config.isProduction,
      
      // Connection pool size based on environment
      maxPoolSize: config.isProduction ? 50 : 10,
      minPoolSize: config.isProduction ? 10 : 2,
      
      // Timeouts
      serverSelectionTimeoutMS: 5000,
      socketTimeoutMS: 45000,
    };
    
    // Extract database name from URI for logging
    const dbName = config.mongoUri.match(/\/([^?]+)/)?.[1] || 'unknown';
    
    console.log(`Connecting to MongoDB (${config.env})...`);
    console.log(`Database: ${dbName}`);
    
    await mongoose.connect(config.mongoUri, options);
    
    console.log(`MongoDB connected successfully`);
    
    // Log index building status in non-production
    if (!config.isProduction) {
      console.log(`Auto-indexing: enabled`);
    }
    
  } catch (error) {
    console.error("MongoDB connection error:", error.message);
    
    // In production, try to reconnect
    if (config.isProduction) {
      console.log("Retrying connection in 5 seconds...");
      setTimeout(connectDB, 5000);
    } else {
      process.exit(1);
    }
  }
};

// Mongoose connection event handlers
mongoose.connection.on('connected', () => {
  if (!config.isTest) {
    console.log('Mongoose connected to MongoDB');
  }
});

mongoose.connection.on('error', (err) => {
  console.error(' Mongoose connection error:', err.message);
});

mongoose.connection.on('disconnected', () => {
  if (!config.isTest) {
    console.warn(' Mongoose disconnected from MongoDB');
  }
});

// Graceful shutdown
process.on('SIGINT', async () => {
  await mongoose.connection.close();
  console.log('Mongoose connection closed due to app termination');
  process.exit(0);
});

export default connectDB;
