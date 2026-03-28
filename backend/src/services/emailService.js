const nodemailer = require('nodemailer');

/**
 * Create email transporter
 */
const createTransporter = () => {
  return nodemailer.createTransport({
    host: process.env.EMAIL_HOST,
    port: parseInt(process.env.EMAIL_PORT),
    secure: process.env.EMAIL_PORT === '465', // true for 465, false for other ports
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASSWORD,
    },
  });
};

/**
 * Send payment confirmation email
 */
const sendPaymentConfirmation = async (userEmail, userName, paymentDetails) => {
  try {
    const transporter = createTransporter();

    const { planName, amount, userCount, subscriptionEndDate, paymentId } = paymentDetails;

    const mailOptions = {
      from: `"Visbli" <${process.env.EMAIL_FROM}>`,
      to: userEmail,
      subject: 'Payment Successful - Visbli Subscription',
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: #6366f1; color: white; padding: 20px; text-align: center; border-radius: 8px 8px 0 0; }
            .content { background: #f9fafb; padding: 30px; border-radius: 0 0 8px 8px; }
            .details { background: white; padding: 20px; border-radius: 8px; margin: 20px 0; }
            .detail-row { display: flex; justify-content: space-between; padding: 10px 0; border-bottom: 1px solid #e5e7eb; }
            .detail-label { font-weight: bold; color: #6b7280; }
            .detail-value { color: #111827; }
            .footer { text-align: center; margin-top: 30px; color: #6b7280; font-size: 14px; }
            .button { display: inline-block; background: #6366f1; color: white; padding: 12px 30px; text-decoration: none; border-radius: 6px; margin: 20px 0; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>Payment Successful! 🎉</h1>
            </div>
            <div class="content">
              <p>Hi ${userName},</p>
              <p>Thank you for subscribing to Visbli! Your payment has been processed successfully.</p>
              
              <div class="details">
                <h2 style="margin-top: 0; color: #6366f1;">Subscription Details</h2>
                <div class="detail-row">
                  <span class="detail-label">Plan:</span>
                  <span class="detail-value">${planName}</span>
                </div>
                <div class="detail-row">
                  <span class="detail-label">Amount Paid:</span>
                  <span class="detail-value">₹${amount}</span>
                </div>
                ${userCount > 1 ? `
                <div class="detail-row">
                  <span class="detail-label">Number of Users:</span>
                  <span class="detail-value">${userCount}</span>
                </div>
                ` : ''}
                <div class="detail-row">
                  <span class="detail-label">Subscription Valid Until:</span>
                  <span class="detail-value">${new Date(subscriptionEndDate).toLocaleDateString('en-IN', { 
                    year: 'numeric', 
                    month: 'long', 
                    day: 'numeric' 
                  })}</span>
                </div>
                <div class="detail-row" style="border-bottom: none;">
                  <span class="detail-label">Payment ID:</span>
                  <span class="detail-value">${paymentId}</span>
                </div>
              </div>

              <p>Your subscription is now active and you have full access to all features included in your plan.</p>
              
              <center>
                <a href="${process.env.APP_URL}/homepage/" class="button">Go to Dashboard</a>
              </center>

              <p style="margin-top: 30px; font-size: 14px; color: #6b7280;">
                If you have any questions or need assistance, please don't hesitate to contact our support team.
              </p>
            </div>
            <div class="footer">
              <p>© ${new Date().getFullYear()} Visbli. All rights reserved.</p>
              <p>This is an automated email. Please do not reply to this message.</p>
            </div>
          </div>
        </body>
        </html>
      `,
      text: `
Hi ${userName},

Thank you for subscribing to Visbli! Your payment has been processed successfully.

Subscription Details:
- Plan: ${planName}
- Amount Paid: ₹${amount}
${userCount > 1 ? `- Number of Users: ${userCount}\n` : ''}- Subscription Valid Until: ${new Date(subscriptionEndDate).toLocaleDateString('en-IN')}
- Payment ID: ${paymentId}

Your subscription is now active and you have full access to all features included in your plan.

If you have any questions or need assistance, please contact our support team.

© ${new Date().getFullYear()} Visbli. All rights reserved.
      `,
    };

    const info = await transporter.sendMail(mailOptions);
    console.log('Payment confirmation email sent:', info.messageId);
    return { success: true, messageId: info.messageId };
  } catch (error) {
    console.error('Error sending payment confirmation email:', error);
    return { success: false, error: error.message };
  }
};

/**
 * Send welcome email
 */
const sendWelcomeEmail = async (userEmail, userName) => {
  try {
    const transporter = createTransporter();

    const mailOptions = {
      from: `"Visbli" <${process.env.EMAIL_FROM}>`,
      to: userEmail,
      subject: 'Welcome to Visbli!',
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: #6366f1; color: white; padding: 20px; text-align: center; border-radius: 8px 8px 0 0; }
            .content { background: #f9fafb; padding: 30px; border-radius: 0 0 8px 8px; }
            .footer { text-align: center; margin-top: 30px; color: #6b7280; font-size: 14px; }
            .button { display: inline-block; background: #6366f1; color: white; padding: 12px 30px; text-decoration: none; border-radius: 6px; margin: 20px 0; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>Welcome to Visbli! 👋</h1>
            </div>
            <div class="content">
              <p>Hi ${userName},</p>
              <p>Welcome to Visbli! We're excited to have you on board.</p>
              <p>Your account has been created successfully. You can now log in and start exploring our platform.</p>
              
              <center>
                <a href="${process.env.APP_URL}/login.html" class="button">Login to Your Account</a>
              </center>

              <p style="margin-top: 30px;">If you have any questions, feel free to reach out to our support team.</p>
            </div>
            <div class="footer">
              <p>© ${new Date().getFullYear()} Visbli. All rights reserved.</p>
            </div>
          </div>
        </body>
        </html>
      `,
    };

    const info = await transporter.sendMail(mailOptions);
    console.log('Welcome email sent:', info.messageId);
    return { success: true, messageId: info.messageId };
  } catch (error) {
    console.error('Error sending welcome email:', error);
    return { success: false, error: error.message };
  }
};

module.exports = {
  sendPaymentConfirmation,
  sendWelcomeEmail,
};
