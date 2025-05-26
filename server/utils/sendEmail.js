import nodemailer from 'nodemailer';
import dotenv from 'dotenv';

dotenv.config();

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
    console.log(`[EmailUtil] Nodemailer transporter configured successfully for host: ${process.env.EMAIL_HOST}`);
} else {
    console.warn('[EmailUtil] Email service is not fully configured. EMAIL_HOST, EMAIL_USER, or EMAIL_PASS might be missing in .env. Emails may not be sent.');
}

const sendEmail = async (options) => {
    if (!transporter) {
        const errorMessage = 'Email transporter is not initialized. Please check server logs for configuration issues (e.g., missing .env variables).';
        console.error(`[EmailUtil] ${errorMessage}`);
        throw new Error(errorMessage);
    }

    const mailOptions = {
        from: process.env.EMAIL_FROM || '"Timesheet App" <noreply@example.com>',
        to: options.to,
        subject: options.subject,
        text: options.text,
        html: options.html,
    };

    try {
        const info = await transporter.sendMail(mailOptions);
        return info;
    } catch (error) {
        console.error(`Error sending email to ${options.to}:`, error);
        throw error;
    }
};

export default sendEmail;
