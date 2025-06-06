import nodemailer from 'nodemailer';

// Choose transporter based on environment
let transporter;

if (process.env.NODE_ENV === 'development' && process.env.USE_ETHEREAL === 'true') {
  // Ethereal for development/testing (set USE_ETHEREAL=true in .env to enable)
  const testAccount = await nodemailer.createTestAccount();
  transporter = nodemailer.createTransport({
    host: 'smtp.ethereal.email',
    port: 587,
    auth: {
      user: testAccount.user,
      pass: testAccount.pass,
    },
  });
  console.log('[emailService] Using Ethereal test account:', testAccount.user);
} else {
  // Gmail or other SMTP for production
  transporter = nodemailer.createTransport({
    service: 'gmail', // or your SMTP provider
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS,
    },
    maxConnections: 3,
    connectionTimeout: 10000,
    greetingTimeout: 10000,
    socketTimeout: 10000,
  });
}

async function sendEmail({ to, subject, html, text }) {
  try {
    await transporter.sendMail({
      from: `"Timesheet App" <${process.env.EMAIL_USER || 'no-reply@example.com'}>`,
      to,
      subject,
      html,
      text,
    });
  } catch (err) {
    console.error('[emailService] Failed to send email:', {
      to, subject, error: err && err.message, stack: err && err.stack
    });
    throw err;
  }
}

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
    // Format date for email (uses luxon for formatting)
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
