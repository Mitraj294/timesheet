// NOTE: This file is NOT used by the main project. It is only for testing how the scheduler and email services work.
// To run and generate notifications: use the command
//    node /home/digilab/timesheet/server/services/seedNotificationService.js
// This will create scheduled notifications for all employee/project/client combinations for today and send them to the employer's email.

import mongoose from "mongoose";
import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";
import ScheduledNotification from "../models/ScheduledNotification.js";
import EmployerSetting from "../models/EmployerSetting.js";
import moment from "moment-timezone";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.resolve(__dirname, "../.env") });

// Connect to MongoDB using MONGO_URI from .env
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

// Calculate next UTC time for a notification based on employer's settings
const calculateNextScheduledUTCFromSettings = (
  dayOfWeekStr,
  localTimeHHMM,
  timezoneStr,
) => {
  if (
    !localTimeHHMM ||
    typeof localTimeHHMM !== "string" ||
    !localTimeHHMM.includes(":")
  ) {
    return null;
  }
  const [hours, minutes] = localTimeHHMM.split(":").map(Number);
  const nowInEmployerTZ = moment.tz(timezoneStr);
  const dayMapping = {
    sunday: 0,
    monday: 1,
    tuesday: 2,
    wednesday: 3,
    thursday: 4,
    friday: 5,
    saturday: 6,
  };
  const targetDayNumber = dayMapping[dayOfWeekStr.toLowerCase()];
  if (typeof targetDayNumber !== "number") {
    return null;
  }
  let scheduledMomentInEmployerTZ = nowInEmployerTZ
    .clone()
    .day(targetDayNumber)
    .hour(hours)
    .minute(minutes)
    .second(0)
    .millisecond(0);
  if (scheduledMomentInEmployerTZ.isBefore(nowInEmployerTZ)) {
    scheduledMomentInEmployerTZ.add(1, "week");
  }
  return scheduledMomentInEmployerTZ.utc().toDate();
};

// Seed notifications for current day for all employees, projects, and clients from your DB
export const seedNotifications = async () => {
  await connectDB();

  try {
    const employerId = new mongoose.Types.ObjectId("67dab2b51670251b9de4ba0a");

    // Fetch models
    const Employee = (await import("../models/Employee.js")).default;
    const Project = (await import("../models/Project.js")).default;
    const Client = (await import("../models/Client.js")).default;
    const User = (await import("../models/User.js")).default;

    // Fetch employer's user record to get employer's email
    const employerUser = await User.findOne({ _id: employerId })
      .select("email name")
      .lean();
    if (!employerUser || !employerUser.email) {
      console.error(
        `Employer user not found or missing email for employerId: ${employerId}`,
      );
      return;
    }

    const employees = await Employee.find({ employerId })
      .select("name email")
      .lean();
    const projects = await Project.find({}).select("name").lean();
    const clients = await Client.find({ employerId }).select("name").lean();

    const subject = "Timesheet Notification";
    const status = "pending";
    const notificationType = "action_alert";
    const attempts = 0;

    // Get employer's settings for timezone and notification times
    const settings = await EmployerSetting.findOne({ employerId });
    if (!settings) {
      console.error(
        `Employer settings not found for employerId: ${employerId}. Cannot seed notifications based on settings.`,
      );
      return;
    }

    const employerTimezone = settings.timezone || "UTC";
    const now = moment.tz(employerTimezone);
    const scheduledTimeUTC = now
      .clone()
      .hour(10)
      .minute(0)
      .second(0)
      .millisecond(0)
      .utc()
      .toDate();
    const referenceDayOfWeekForSeed = now.format("dddd").toLowerCase();

    const today = new Date();
    const options = { year: "numeric", month: "long", day: "numeric" };
    const formattedDateForMessage = today.toLocaleDateString("en-US", options);

    let documentsToInsert = [];
    const batchSize = 10;

    // Send notifications to employer's email, not employee's
    for (const employee of employees) {
      for (const project of projects) {
        for (const client of clients) {
          const messageBody = `Hello ${employerUser.name || "Employer"},\n\nA timesheet for employee ${employee.name} on ${formattedDateForMessage} for project "${project.name}" and client "${client.name}" was updated.\n\nThank you,\nTimesheet App`;
          documentsToInsert.push({
            employerId: employerId,
            recipientEmail: employerUser.email, // Send to employer
            subject: subject,
            messageBody: messageBody,
            scheduledTimeUTC: scheduledTimeUTC,
            status: status,
            notificationType: notificationType,
            referenceDayOfWeek: referenceDayOfWeekForSeed,
            attempts: attempts,
          });
          if (documentsToInsert.length === batchSize) {
            await ScheduledNotification.insertMany(documentsToInsert);
            console.log(
              `Inserted batch of ${documentsToInsert.length} notifications.`,
            );
            documentsToInsert = [];
          }
        }
      }
    }
    if (documentsToInsert.length > 0) {
      await ScheduledNotification.insertMany(documentsToInsert);
      console.log(
        `Inserted batch of ${documentsToInsert.length} notifications.`,
      );
    }

    console.log(
      `Successfully inserted notifications for all employee/project/client combinations for today.`,
    );
  } catch (error) {
    console.error("Error seeding notifications:", error);
  } finally {
    await mongoose.disconnect();
    console.log("MongoDB disconnected.");
  }
};

// Run seeding if this file is executed directly
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  seedNotifications();
}
