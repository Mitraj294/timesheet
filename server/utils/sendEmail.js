import nodemailer from 'nodemailer';
import dotenv from 'dotenv';

dotenv.config();

// Asynchronously sends an email using nodemailer.
// `options` should include: to, subject, text, and/or html.
const sendEmail = async (options) => {
    console.log(`[${new Date().toISOString()}] Attempting to send email to: ${options.to} with subject: "${options.subject}"`);
    
    const transporter = nodemailer.createTransport({
        host: process.env.EMAIL_HOST,
        port: parseInt(process.env.EMAIL_PORT || '587', 10),
        // secure: true for port 465, secure: false for port 587 (STARTTLS)
        // Adjust this logic based on your email provider's requirements
        secure: parseInt(process.env.EMAIL_PORT || '587', 10) === 465,
        auth: {
            user: process.env.EMAIL_USER,
            pass: process.env.EMAIL_PASS,
        },
    });

    const mailOptions = {
        from: process.env.EMAIL_FROM,
        to: options.to,
        subject: options.subject,
        text: options.text,
        html: options.html,
    };

    try {
        const info = await transporter.sendMail(mailOptions);
        console.log(`Email sent successfully to ${options.to}. Message ID: ${info.messageId}`);
        return info;
    } catch (error) {
        console.error(`Error sending email to ${options.to}: `, error.message);
        throw new Error('Email could not be sent due to a server error.');
    }
};

export default sendEmail;
