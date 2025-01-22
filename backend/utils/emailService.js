const nodemailer = require('nodemailer');
const { sessionVenueMapping } = require('./mappings');
const crypto = require('crypto');

// Add debug logging to see environment variables (mask sensitive data)
console.log('Email Configuration:', {
  user: process.env.GMAIL_USER ? '***@gmail.com' : undefined,
  passwordSet: !!process.env.GMAIL_APP_PASSWORD,
  frontendUrl: process.env.FRONTEND_URL
});

const generateToken = () => crypto.randomBytes(32).toString('hex');

// Validate email configuration
const validateConfig = () => {
  const requiredVars = ['GMAIL_USER', 'GMAIL_APP_PASSWORD', 'FRONTEND_URL'];
  const missing = requiredVars.filter(key => !process.env[key]);
  
  if (missing.length) {
    console.error('Missing environment variables:', missing);
    throw new Error(`Missing required environment variables: ${missing.join(', ')}`);
  }
};

// Create reusable transporter
let transporter = null;

const createTransporter = async () => {
  try {
    if (!transporter) {
      validateConfig();
      
      transporter = nodemailer.createTransport({
        host: 'smtp.gmail.com',
        port: 587,
        secure: false,
        auth: {
          user: process.env.GMAIL_USER,
          pass: process.env.GMAIL_APP_PASSWORD
        },
        debug: true,
        logger: true
      });

      // Verify connection
      await transporter.verify();
      console.log('SMTP connection verified successfully');
    }
    return transporter;
  } catch (error) {
    console.error('Failed to create transporter:', error);
    throw new Error(`Email configuration error: ${error.message}`);
  }
};

const sendScheduleEmail = async (schedule) => {
  try {
    if (!schedule || !schedule.email) {
      console.error('Invalid schedule data:', schedule);
      throw new Error('Invalid schedule data: missing email');
    }

    // Log schedule data for debugging
    console.log('Schedule data received:', {
      paperId: schedule.paperId,
      email: schedule.email,
      title: schedule.title?.substring(0, 50),
      session: schedule.sessions,
      date: schedule.date
    });

    const transport = await createTransporter();
    if (!transport) {
      throw new Error('Failed to create email transport');
    }

    const token = generateToken();
    const confirmationLink = `${process.env.FRONTEND_URL}/confirm/${token}`;
    const denyLink = `${process.env.FRONTEND_URL}/deny/${token}`;
    const venue = sessionVenueMapping[schedule.sessions];

    if (!venue) {
      console.warn(`No venue found for session: ${schedule.sessions}`);
    }

    console.log('Preparing to send email:', {
      to: schedule.email,
      confirmationLink: confirmationLink,
      venue: venue || 'Venue not assigned'
    });

    const mailOptions = {
      from: `"RAMSITA 2025" <${process.env.GMAIL_USER}>`,
      to: schedule.email,
      subject: 'RAMSITA 2025 - Conference Presentation Schedule Confirmation',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #f9f9f9; border-radius: 8px;">
          <div style="background-color: #2c3e50; padding: 20px; border-radius: 8px 8px 0 0;">
            <h2 style="color: white; text-align: center; margin: 0;">Conference Presentation Schedule</h2>
          </div>
          
          <div style="background-color: white; padding: 20px; border-radius: 0 0 8px 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
            <table style="width: 100%; border-collapse: collapse;">
              <tr>
                <td style="padding: 10px; border-bottom: 1px solid #eee;"><strong>Paper ID:</strong></td>
                <td style="padding: 10px; border-bottom: 1px solid #eee;">${schedule.paperId}</td>
              </tr>
              <tr>
                <td style="padding: 10px; border-bottom: 1px solid #eee;"><strong>Title:</strong></td>
                <td style="padding: 10px; border-bottom: 1px solid #eee;">${schedule.title || 'Not specified'}</td>
              </tr>
              <tr>
                <td style="padding: 10px; border-bottom: 1px solid #eee;"><strong>Date:</strong></td>
                <td style="padding: 10px; border-bottom: 1px solid #eee;">${schedule.date || 'Not specified'}</td>
              </tr>
              <tr>
                <td style="padding: 10px; border-bottom: 1px solid #eee;"><strong>Time:</strong></td>
                <td style="padding: 10px; border-bottom: 1px solid #eee;">${schedule.timeSlots || 'Not specified'}</td>
              </tr>
              <tr>
                <td style="padding: 10px; border-bottom: 1px solid #eee;"><strong>Session:</strong></td>
                <td style="padding: 10px; border-bottom: 1px solid #eee;">${schedule.sessions || 'Not specified'}</td>
              </tr>
              <tr>
                <td style="padding: 10px; border-bottom: 1px solid #eee;"><strong>Venue:</strong></td>
                <td style="padding: 10px; border-bottom: 1px solid #eee;">${venue || 'Venue not assigned'}</td>
              </tr>
              <tr>
                <td style="padding: 10px; border-bottom: 1px solid #eee;"><strong>Mode:</strong></td>
                <td style="padding: 10px; border-bottom: 1px solid #eee;">${schedule.mode || 'Not specified'}</td>
              </tr>
              <tr>
                <td style="padding: 10px;"><strong>Track:</strong></td>
                <td style="padding: 10px;">${schedule.tracks || 'Not specified'}</td>
              </tr>
            </table>

            <div style="text-align: center; margin: 30px 0;">
              <p style="margin-bottom: 20px; color: #666;">Please confirm your scheduled presentation:</p>
              <div style="margin-bottom: 15px;">
                <a href="${confirmationLink}" style="background: #2ecc71; color: white; padding: 12px 25px; text-decoration: none; border-radius: 5px; margin: 10px; display: inline-block;">Confirm</a>
                <a href="${denyLink}" style="background: #e74c3c; color: white; padding: 12px 25px; text-decoration: none; border-radius: 5px; margin: 10px; display: inline-block;">Deny</a>
              </div>
              <p style="color: #e74c3c; font-size: 0.9em; margin-top: 15px;">Note: Once you select an option, you cannot change your response.</p>
            </div>
          </div>
        </div>
      `
    };

    try {
      const info = await transport.sendMail(mailOptions);
      console.log('Email sent successfully:', {
        messageId: info.messageId,
        response: info.response,
        to: schedule.email
      });
      return token;
    } catch (emailError) {
      console.error('Failed to send email:', {
        error: emailError.message,
        code: emailError.code,
        command: emailError.command
      });
      throw new Error(`Failed to send email: ${emailError.message}`);
    }
  } catch (error) {
    console.error('Email service error details:', {
      name: error.name,
      message: error.message,
      code: error.code,
      command: error.command,
      stack: error.stack
    });
    throw error; // Preserve the original error
  }
};

module.exports = { sendScheduleEmail }; 