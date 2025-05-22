import nodemailer from 'nodemailer';
import dotenv from 'dotenv';

dotenv.config();

// Asynchronously sends an email using nodemailer.
// `options` should include: to, subject, text, and/or html.
const sendEmail = async (options) => {
    console.log(`[${new Date().toISOString()}] Attempting to send email to: ${options.to} with subject: "${options.subject}"`); // Keep this log for tracking attempts

    const emailPort = parseInt(process.env.EMAIL_PORT || '587', 10);

    const transporter = nodemailer.createTransport({
        host: process.env.EMAIL_HOST,
        port: emailPort,
        // secure: true for port 465 (SMTPS), secure: false for other ports like 587 (STARTTLS).
        // This logic generally covers common email provider configurations.
        secure: emailPort === 465,
        auth: {
            user: process.env.EMAIL_USER, // Ensure EMAIL_USER is set in your .env
            pass: process.env.EMAIL_PASS, // Ensure EMAIL_PASS is set in your .env
        },
        // Adding timeouts for SMTP connection, greeting, and socket can prevent hangs.
        connectionTimeout: 10000, // 10 seconds
        greetingTimeout: 10000,   // 10 seconds
        socketTimeout: 10000,     // 10 seconds
    });

    const mailOptions = {
        from: process.env.EMAIL_FROM || '"Timesheet App" <noreply@example.com>', // Default if EMAIL_FROM is not set
        to: options.to, // Recipient's email address
        subject: options.subject, // Email subject
        text: options.text, // Plain text body of the email
        html: options.html, // HTML body of the email (optional)
    };

    try {
        const info = await transporter.sendMail(mailOptions);
        console.log(`Email sent successfully to ${options.to}. Message ID: ${info.messageId}`);
        return info;
    } catch (error) {
        console.error(`Error sending email to ${options.to}:`, error); // Log the full error object for more details
        // Re-throw a new error or the original error. Including the original message can be helpful.
        throw new Error(`Email could not be sent. Reason: ${error.message}`);
    }
};

export default sendEmail;
