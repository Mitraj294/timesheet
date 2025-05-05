import nodemailer from 'nodemailer';
import dotenv from 'dotenv';

// Load environment variables from .env file
dotenv.config();

const sendEmail = async (options) => {
    // 1. Create a transporter object using SMTP transport
    // Ensure environment variables are set correctly in your .env file
    const transporter = nodemailer.createTransport({
        host: process.env.EMAIL_HOST,
        port: parseInt(process.env.EMAIL_PORT || '587', 10), // Default to 587 if not set
        secure: process.env.EMAIL_PORT === '465', // true for 465, false for other ports like 587
        auth: {
            user: process.env.EMAIL_USER, // Your email service username
            pass: process.env.EMAIL_PASS, // Your email service password or app-specific key
        },
        // Optional: Add TLS options if needed, e.g., for local development
        // tls: {
        //     rejectUnauthorized: false // Use only for development/testing if necessary
        // }
    });

    // 2. Define the email options
    const mailOptions = {
        from: process.env.EMAIL_FROM, // Sender address (e.g., '"Your App Name" <noreply@example.com>')
        to: options.to,               // List of receivers (passed in options)
        subject: options.subject,     // Subject line (passed in options)
        text: options.text,           // Plain text body (optional, passed in options)
        html: options.html,           // HTML body (passed in options)
    };

    // 3. Send the email
    try {
        const info = await transporter.sendMail(mailOptions);
        console.log('Email sent: %s', info.messageId);
        return info; // Return info object on success
    } catch (error) {
        console.error('Error sending email: ', error);
        throw new Error('Email could not be sent due to a server error.'); // Re-throw a generic error
    }
};

export default sendEmail;