import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import ScheduledNotification from '../models/ScheduledNotification.js';
import EmployerSetting from '../models/EmployerSetting.js';
import moment from 'moment-timezone';

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

const calculateNextScheduledUTCFromSettings = (dayOfWeekStr, localTimeHHMM, timezoneStr) => {
  if (!localTimeHHMM || typeof localTimeHHMM !== 'string' || !localTimeHHMM.includes(':')) {
    return null;
  }
  const [hours, minutes] = localTimeHHMM.split(':').map(Number);
  const nowInEmployerTZ = moment.tz(timezoneStr);
  const dayMapping = {
    sunday: 0, monday: 1, tuesday: 2, wednesday: 3,
    thursday: 4, friday: 5, saturday: 6,
  };
  const targetDayNumber = dayMapping[dayOfWeekStr.toLowerCase()];
  if (typeof targetDayNumber !== 'number') {
    return null;
  }
  let scheduledMomentInEmployerTZ = nowInEmployerTZ.clone().day(targetDayNumber).hour(hours).minute(minutes).second(0).millisecond(0);
  if (scheduledMomentInEmployerTZ.isBefore(nowInEmployerTZ)) {
    scheduledMomentInEmployerTZ.add(1, 'week');
  }
  return scheduledMomentInEmployerTZ.utc().toDate();
};

export const seedNotifications = async () => {
  await connectDB();

  try {
    const numberOfEntries = 10;
    const employerId = new mongoose.Types.ObjectId("67dab2b51670251b9de4ba0a");
    const recipientEmail = "meetrajsinhjadeja04@gmail.com";
    const subject = "Seeded Test Notification";
    const status = "pending";
    const notificationType = "action_alert";
    const attempts = 0;

    const settings = await EmployerSetting.findOne({ employerId });
    if (!settings) {
      console.error(`Employer settings not found for employerId: ${employerId}. Cannot seed notifications based on settings.`);
      return;
    }

    const employerTimezone = settings.timezone || 'UTC';
    let scheduledTimeUTC;
    let referenceDayOfWeekForSeed = 'monday';

    const mondaySettingDate = settings.globalNotificationTimes?.monday;

    if (mondaySettingDate instanceof Date) {
        scheduledTimeUTC = mondaySettingDate;
    } else {
        console.warn(`Monday notification time not set for employer ${employerId} or is invalid. Seeding for tomorrow 10:00 local time in timezone ${employerTimezone}.`);
        const tomorrowAt10AM = moment.tz(employerTimezone).add(1, 'day').hour(10).minute(0).second(0).millisecond(0);
        scheduledTimeUTC = tomorrowAt10AM.utc().toDate();
        referenceDayOfWeekForSeed = tomorrowAt10AM.format('dddd').toLowerCase();
    }

    const today = new Date();
    const options = { year: 'numeric', month: 'long', day: 'numeric' };
    const formattedDateForMessage = today.toLocaleDateString('en-US', options);

    const messageBody = `Hello Meetraj Jadeja,\n\nA timesheet for employee MITRAJ on ${formattedDateForMessage} was updated.\n\nThank you,\nTimesheet App`;

    let documentsToInsert = [];
    const batchSize = 100;

    console.log(`Starting to generate ${numberOfEntries} scheduled notifications for ${referenceDayOfWeekForSeed} at ${scheduledTimeUTC.toISOString()}...`);

    for (let i = 0; i < numberOfEntries; i++) {
      documentsToInsert.push({
        employerId: employerId,
        recipientEmail: recipientEmail,
        subject: subject,
        messageBody: messageBody,
        scheduledTimeUTC: scheduledTimeUTC,
        status: status,
        notificationType: notificationType,
        referenceDayOfWeek: referenceDayOfWeekForSeed,
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

// If run directly, execute the seeding
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  seedNotifications();
}
