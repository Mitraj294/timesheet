import nodemailer from "nodemailer";
import config from "../config/env.js";

let transporter = null;
let emailEnabled = false;

// Initialize email transporter if configuration is available
if (
  config.email.host &&
  config.email.port &&
  config.email.user &&
  config.email.pass
) {
  transporter = nodemailer.createTransport({
    host: config.email.host,
    port: config.email.port,
    secure: config.email.port === 465, // true for 465, false for others
    auth: {
      user: config.email.user,
      pass: config.email.pass,
    },
  });
  emailEnabled = true;
  console.log(`Email service initialized (${config.email.host}:${config.email.port})`);
} else if (!global.__EMAIL_CONFIG_WARNED && !config.isTest) {
  console.warn("Email functionality disabled (missing configuration)");
  global.__EMAIL_CONFIG_WARNED = true;
}

const sendEmail = async (options) => {
  // In test environment, just log and return success
  if (config.isTest) {
    console.log(`[TEST] Email would be sent to: ${options.to}`);
    return { messageId: 'test-' + Date.now() };
  }
  
  if (!emailEnabled) {
    throw new Error("Email functionality is disabled due to missing configuration.");
  }

  try {
    const mailOptions = {
      from: config.email.from,
      to: options.to,
      subject: options.subject,
      text: options.text,
      html: options.html,
      attachments: options.attachments,
    };

    const info = await transporter.sendMail(mailOptions);
    
    // Log in development only
    if (config.isDevelopment) {
      console.log(`Email sent: ${options.subject} → ${options.to}`);
    }
    
    return info;
  } catch (error) {
    console.error('Email failed:', error.message);
    throw new Error('Email sending failed. Please check the configuration.');
  }
}

// Notify employee of new role assignment
export const sendRoleAssignmentEmail = async (employee, roleName) => {
  if (!employee?.userId?.email) return;
  return sendEmail({
    to: employee.userId.email,
    subject: `New Role Assignment: ${roleName}`,
    html: `<p>Hi ${employee.userId.name || "Employee"},</p><p>You have been assigned to a new role: <b>${roleName}</b>.</p>`,
  });
};

// Notify employee of role update
export const sendRoleUpdateEmail = async (employee, roleName) => {
  if (!employee?.userId?.email) return;
  return sendEmail({
    to: employee.userId.email,
    subject: `Role Updated: ${roleName}`,
    html: `<p>Hi ${employee.userId.name || "Employee"},</p><p>Your role <b>${roleName}</b> has been updated.</p>`,
  });
};

// Notify employee of new shifts (bulk)
export const sendScheduleAssignmentEmail = async (email, name, shifts) => {
  if (!email) return;
  const shiftsList = shifts.map((s) => `<li>${s}</li>`).join("");
  return sendEmail({
    to: email,
    subject: "New Shifts Assigned",
    html: `<p>Hi ${name || "Employee"},</p><p>You have new shifts:</p><ul>${shiftsList}</ul>`,
  });
};

// Notify employee of a shift update
export const sendScheduleUpdateEmail = async (employee, updatedSchedule) => {
  if (!employee?.userId?.email) return;
  const { name, email } = employee.userId;
  const { date, startTime, endTime } = updatedSchedule;
  let dateStr = "";
  if (date) {
    // Format date for email (uses luxon for formatting)
    const { DateTime } = require("luxon");
    dateStr = DateTime.fromJSDate(date).toLocal().toFormat("EEE, MMM d");
  }
  return sendEmail({
    to: email,
    subject: "Your Shift Has Been Updated",
    html: `<p>Hi ${name || "Employee"},</p><p>Your shift for ${dateStr} (${startTime} - ${endTime}) has been updated.</p>`,
  });
};

// Test email function
export const testEmailService = async () => {
  console.log("[emailService] Test email function executed.");
  console.log("[emailService] Preparing to send test email...");
  console.log("[emailService] Transporter configuration:", transporter.options);
  try {
    const testEmail = await transporter.sendMail({
      from: `"Timesheet App" <${process.env.SMTP_USER || "no-reply@example.com"}>`,
      to: process.env.TEST_EMAIL || "test@example.com",
      subject: "Test Email",
      text: "This is a test email from the Timesheet App.",
    });
    console.log("[emailService] Test email sent successfully:", testEmail);
  } catch (err) {
    console.error("[emailService] Failed to send test email:", err);
  }
};

export default sendEmail;
