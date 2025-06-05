import nodemailer from 'nodemailer';
import dotenv from 'dotenv';
dotenv.config();

// Setup email transporter
let transporter;
const emailPort = parseInt(process.env.EMAIL_PORT || '587', 10);
const maxEmailConnections = parseInt(process.env.EMAIL_MAX_CONNECTIONS || '5', 10);

if (process.env.EMAIL_HOST && process.env.EMAIL_USER && process.env.EMAIL_PASS) {
  transporter = nodemailer.createTransport({
    host: process.env.EMAIL_HOST,
    port: emailPort,
    secure: emailPort === 465,
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS,
    },
    pool: true,
    maxConnections: maxEmailConnections,
    connectionTimeout: 10000,
    greetingTimeout: 10000,
    socketTimeout: 10000,
  });
} else {
  console.warn('Email service not fully configured. Check .env.');
}

// Send a basic email
const sendEmail = async (options) => {
  if (!transporter) throw new Error('Email transporter not initialized.');
  const mailOptions = {
    from: process.env.EMAIL_FROM || '"Timesheet App" <noreply@example.com>',
    to: options.to,
    subject: options.subject,
    text: options.text,
    html: options.html,
  };
  try {
    return await transporter.sendMail(mailOptions);
  } catch (error) {
    console.error(`Error sending email to ${options.to}:`, error);
    throw error;
  }
};

// Notify employee of new role assignment
export const sendRoleAssignmentEmail = async (employee, roleName) => {
  if (!employee?.userId?.email) return;
  return sendEmail({
    to: employee.userId.email,
    subject: `New Role Assignment: ${roleName}`,
    html: `<p>Hi ${employee.userId.name || 'Employee'},</p><p>You have been assigned to a new role: <b>${roleName}</b>.</p>`
  });
};

// Notify employee of role update
export const sendRoleUpdateEmail = async (employee, roleName) => {
  if (!employee?.userId?.email) return;
  return sendEmail({
    to: employee.userId.email,
    subject: `Role Updated: ${roleName}`,
    html: `<p>Hi ${employee.userId.name || 'Employee'},</p><p>Your role <b>${roleName}</b> has been updated.</p>`
  });
};

// Notify employee of new shifts (bulk)
export const sendScheduleAssignmentEmail = async (email, name, shifts) => {
  if (!email) return;
  return sendEmail({
    to: email,
    subject: 'New Shifts Assigned',
    html: `<p>Hi ${name || 'Employee'},</p><p>You have new shifts:</p><ul>${shifts.map(s => `<li>${s}</li>`).join('')}</ul>`
  });
};

// Notify employee of a shift update
export const sendScheduleUpdateEmail = async (employee, updatedSchedule) => {
  if (!employee?.userId?.email) return;
  const { name, email } = employee.userId;
  const { date, startTime, endTime } = updatedSchedule;
  let dateStr = '';
  if (date) {
    const { DateTime } = require('luxon');
    dateStr = DateTime.fromJSDate(date).toLocal().toFormat('EEE, MMM d');
  }
  return sendEmail({
    to: email,
    subject: 'Your Shift Has Been Updated',
    html: `<p>Hi ${name || 'Employee'},</p><p>Your shift for ${dateStr} (${startTime} - ${endTime}) has been updated.</p>`
  });
};

export default sendEmail;
