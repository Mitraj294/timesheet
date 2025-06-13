import 'dotenv/config'; // Ensure env vars are loaded even if this file is imported first
import nodemailer from "nodemailer";

// Debug: log the config at initialization
console.log("[emailService] EMAIL CONFIG AT INIT:", {
  EMAIL_HOST: process.env.EMAIL_HOST,
  EMAIL_PORT: process.env.EMAIL_PORT,
  EMAIL_USER: process.env.EMAIL_USER,
  EMAIL_PASS: process.env.EMAIL_PASS ? "(set)" : "(not set)",
  EMAIL_FROM: process.env.EMAIL_FROM,
});

let transporter = null;
let emailEnabled = false;

if (
  process.env.EMAIL_HOST &&
  process.env.EMAIL_PORT &&
  process.env.EMAIL_USER &&
  process.env.EMAIL_PASS
) {
  transporter = nodemailer.createTransport({
    host: process.env.EMAIL_HOST,
    port: Number(process.env.EMAIL_PORT),
    secure: Number(process.env.EMAIL_PORT) === 465, // true for 465, false for others
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS,
    },
  });
  emailEnabled = true;
} else {
  if (!global.__EMAIL_CONFIG_WARNED) {
    console.error("Email functionality is disabled due to missing configuration.");
    global.__EMAIL_CONFIG_WARNED = true;
  }
}

const sendEmail = async (options) => {
  if (!emailEnabled) {
    throw new Error("Email functionality is disabled due to missing configuration.");
  }

  try {
    const mailOptions = {
      from: process.env.EMAIL_FROM || `"Timesheet App" <${process.env.EMAIL_USER}>`,
      to: options.to,
      subject: options.subject,
      text: options.text,
      html: options.html,
      attachments: options.attachments,
    };

    console.log('[emailService] Sending email with options:', {
      ...mailOptions,
      text: mailOptions.text ? '[text set]' : undefined,
      html: mailOptions.html ? '[html set]' : undefined,
      attachments: mailOptions.attachments ? '[attachments set]' : undefined,
    });

    const info = await transporter.sendMail(mailOptions);
    console.log('[emailService] Email sent successfully:', info.response);
    return info;
  } catch (error) {
    console.error('[emailService] Failed to send email:', error);
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
  return sendEmail({
    to: email,
    subject: "New Shifts Assigned",
    html: `<p>Hi ${name || "Employee"},</p><p>You have new shifts:</p><ul>${shifts.map((s) => `<li>${s}</li>`).join("")}</ul>`,
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
