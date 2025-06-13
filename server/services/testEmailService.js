import dotenv from 'dotenv';
import nodemailer from 'nodemailer';

dotenv.config();

const transporter = nodemailer.createTransport({
  host: process.env.EMAIL_HOST,
  port: parseInt(process.env.EMAIL_PORT, 10), // Ensure port is a number
  secure: false, // Use STARTTLS
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});

transporter.verify((error, success) => {
  if (error) {
    console.error('Transporter verification failed:', error);
  } else {
    console.log('Transporter is ready:', success);
  }
});

export const testEmail = async () => {
  try {
    console.log('Loaded Environment Variables:', {
      host: process.env.EMAIL_HOST,
      port: process.env.EMAIL_PORT,
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS ? '*****' : undefined,
    });

    const mailOptions = {
      from: `"Timesheet App" <${process.env.EMAIL_USER}>`,
      to: 'meetrajsinhjadeja04@gmail.com', // Replace with a test recipient
      subject: 'Test Email from Timesheet App',
      text: 'This is a test email to verify the email service configuration.',
    };

    console.log('Sending test email with options:', mailOptions);

    // Send a test email
    const info = await transporter.sendMail({
      from: process.env.EMAIL_FROM,
      to: 'meetrajsinh04@gmail.com',
      subject: 'Test Email from Timesheet App',
      text: 'This is a test email to verify the email configuration.',
    });
    console.log('Test email sent successfully:', info);
  } catch (error) {
    console.error('Error sending test email:', error);
  }
};
