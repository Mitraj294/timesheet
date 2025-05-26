import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import ScheduledNotification from '../models/ScheduledNotification.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.resolve(__dirname, '../.env') });

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
    process.exit(1);
  }
};

const seedNotifications = async () => {
  await connectDB();

  try {
    const numberOfEntries = 1000;
    const employerId = new mongoose.Types.ObjectId("67dab2b51670251b9de4ba0a");
    const recipientEmail = "meetrajsinhjadeja04@gmail.com";
    const subject = "Timesheet updated by MITRAJ";
    const messageBody = "Hello Meetraj Jadeja,\n\nA timesheet for employee MITRAJ on May 26, 2025 was updated.\n\nThank you,\nTimesheet App";
    const scheduledTimeUTC = new Date("2025-05-26T16:00:00.000Z");
    const status = "pending";
    const notificationType = "action_alert";
    const referenceDayOfWeek = null;
    const attempts = 0;

    let documentsToInsert = [];
    const batchSize = 100;

    console.log(`Starting to generate ${numberOfEntries} identical scheduled notifications...`);

    for (let i = 0; i < numberOfEntries; i++) {
      documentsToInsert.push({
        employerId: employerId,
        recipientEmail: recipientEmail,
        subject: subject,
        messageBody: messageBody,
        scheduledTimeUTC: scheduledTimeUTC,
        status: status,
        notificationType: notificationType,
        referenceDayOfWeek: referenceDayOfWeek,
        attempts: attempts,
      });

      if (documentsToInsert.length === batchSize || i === numberOfEntries - 1) {
        if (documentsToInsert.length > 0) {
          await ScheduledNotification.insertMany(documentsToInsert);
          console.log(`Inserted batch of ${documentsToInsert.length} notifications. Total inserted so far: ${i + 1}`);
          documentsToInsert = [];
        }
      }
    }

    console.log(`Successfully inserted ${numberOfEntries} identical scheduled notifications.`);

  } catch (error) {
    console.error("Error seeding notifications:", error);
  } finally {
    await mongoose.disconnect();
    console.log("MongoDB disconnected.");
  }
};

seedNotifications();
