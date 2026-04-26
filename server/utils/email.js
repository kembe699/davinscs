import nodemailer from 'nodemailer';
import dotenv from 'dotenv';
dotenv.config();

const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
});

const fromAddress = `"FlippedPOS" <${process.env.SMTP_USER}>`;

export const sendWelcomeEmail = async (email, businessName, customerCode, schemaName) => {
  const portalUrl = process.env.APP_URL || 'https://flippedpos.com';
  const html = `
    <div style="font-family:sans-serif;max-width:600px;margin:auto;background:#09090b;color:#e4e4e7;border:1px solid #27272a;border-radius:12px;overflow:hidden;">
      <div style="padding:32px;">
        <h2 style="color:#ffffff;margin:0 0 16px;">Welcome to FlippedPOS!</h2>
        <p style="color:#a1a1aa;font-size:15px;line-height:1.6;margin:0 0 24px;">
          Hi ${businessName},<br/><br/>
          Your FlippedPOS instance has been successfully provisioned. Here are your account details:
        </p>
        <div style="margin-bottom:24px;background:#18181b;border:1px solid #27272a;border-radius:8px;padding:16px;">
          <table style="width:100%;border-collapse:collapse;">
            <tr><td style="padding:8px 0;color:#71717a;font-size:13px;width:120px;">Customer Code</td><td style="padding:8px 0;color:#ffffff;font-size:15px;font-weight:bold;">${customerCode}</td></tr>
            <tr><td style="padding:8px 0;color:#71717a;font-size:13px;">Login Email</td><td style="padding:8px 0;color:#e4e4e7;font-size:13px;">${email}</td></tr>
            <tr><td style="padding:8px 0;color:#71717a;font-size:13px;">Database Schema</td><td style="padding:8px 0;color:#e4e4e7;font-size:13px;font-family:monospace;">${schemaName}</td></tr>
          </table>
        </div>
        <a href="${portalUrl}/account" style="display:inline-block;background:#ffffff;color:#000000;text-decoration:none;padding:12px 24px;border-radius:6px;font-weight:bold;font-size:14px;">Access Customer Portal</a>
        <p style="color:#52525b;font-size:12px;margin-top:32px;">If you have any questions, simply reply to this email.</p>
      </div>
    </div>
  `;
  try {
    await transporter.sendMail({
      from: fromAddress,
      to: email,
      subject: 'Welcome to FlippedPOS - Your Account Details',
      html,
    });
  } catch (error) {
    console.error('Error sending welcome email:', error);
  }
};

export const sendInvoiceCreatedEmail = async (email, invoiceNumber, planName, amount) => {
  const portalUrl = process.env.APP_URL || 'https://flippedpos.com';
  const html = `
    <div style="font-family:sans-serif;max-width:600px;margin:auto;background:#09090b;color:#e4e4e7;border:1px solid #27272a;border-radius:12px;overflow:hidden;">
      <div style="padding:32px;">
        <h2 style="color:#ffffff;margin:0 0 16px;">New Invoice Generated</h2>
        <p style="color:#a1a1aa;font-size:15px;line-height:1.6;margin:0 0 24px;">
          A new invoice has been generated for your account.
        </p>
        <div style="margin-bottom:24px;background:#18181b;border:1px solid #27272a;border-radius:8px;padding:16px;">
          <table style="width:100%;border-collapse:collapse;">
            <tr><td style="padding:8px 0;color:#71717a;font-size:13px;width:120px;">Invoice Number</td><td style="padding:8px 0;color:#e4e4e7;font-size:13px;">${invoiceNumber}</td></tr>
            <tr><td style="padding:8px 0;color:#71717a;font-size:13px;">Plan</td><td style="padding:8px 0;color:#e4e4e7;font-size:13px;">${planName || 'FlippedPOS Subscription'}</td></tr>
            <tr><td style="padding:8px 0;color:#71717a;font-size:13px;">Amount Due</td><td style="padding:8px 0;color:#ffffff;font-size:15px;font-weight:bold;">$${amount}</td></tr>
          </table>
        </div>
        <a href="${portalUrl}/account/billing" style="display:inline-block;background:#ffffff;color:#000000;text-decoration:none;padding:12px 24px;border-radius:6px;font-weight:bold;font-size:14px;">View & Download Invoice</a>
        <p style="color:#52525b;font-size:12px;margin-top:32px;">Please process payment to avoid service interruption.</p>
      </div>
    </div>
  `;
  try {
    await transporter.sendMail({
      from: fromAddress,
      to: email,
      subject: `New Invoice ${invoiceNumber} - FlippedPOS`,
      html,
    });
  } catch (error) {
    console.error('Error sending invoice created email:', error);
  }
};

export const sendInvoicePaidEmail = async (email, invoiceNumber, amount, newExpiry) => {
  const portalUrl = process.env.APP_URL || 'https://flippedpos.com';
  const html = `
    <div style="font-family:sans-serif;max-width:600px;margin:auto;background:#09090b;color:#e4e4e7;border:1px solid #27272a;border-radius:12px;overflow:hidden;">
      <div style="padding:32px;">
        <h2 style="color:#ffffff;margin:0 0 16px;">Payment Received</h2>
        <p style="color:#a1a1aa;font-size:15px;line-height:1.6;margin:0 0 24px;">
          Thank you! We have received your payment for invoice <strong>${invoiceNumber}</strong>.
        </p>
        <div style="margin-bottom:24px;background:#18181b;border:1px solid #27272a;border-radius:8px;padding:16px;">
          <table style="width:100%;border-collapse:collapse;">
            <tr><td style="padding:8px 0;color:#71717a;font-size:13px;width:120px;">Amount Paid</td><td style="padding:8px 0;color:#ffffff;font-size:15px;font-weight:bold;">$${amount}</td></tr>
            <tr><td style="padding:8px 0;color:#71717a;font-size:13px;">New Expiry Date</td><td style="padding:8px 0;color:#e4e4e7;font-size:13px;">${new Date(newExpiry).toLocaleDateString()}</td></tr>
          </table>
        </div>
        <p style="color:#a1a1aa;font-size:15px;line-height:1.6;margin:0 0 24px;">Your subscription is now active.</p>
        <a href="${portalUrl}/account" style="display:inline-block;background:#ffffff;color:#000000;text-decoration:none;padding:12px 24px;border-radius:6px;font-weight:bold;font-size:14px;">Go to Portal</a>
      </div>
    </div>
  `;
  try {
    await transporter.sendMail({
      from: fromAddress,
      to: email,
      subject: `Payment Receipt for Invoice ${invoiceNumber} - FlippedPOS`,
      html,
    });
  } catch (error) {
    console.error('Error sending invoice paid email:', error);
  }
};

export const sendExpiryReminderEmail = async (email, businessName, expiryDate) => {
  const portalUrl = process.env.APP_URL || 'https://flippedpos.com';
  const html = `
    <div style="font-family:sans-serif;max-width:600px;margin:auto;background:#09090b;color:#e4e4e7;border:1px solid #27272a;border-radius:12px;overflow:hidden;">
      <div style="padding:32px;">
        <h2 style="color:#ffffff;margin:0 0 16px;">Action Required: Subscription Expiring Soon</h2>
        <p style="color:#a1a1aa;font-size:15px;line-height:1.6;margin:0 0 24px;">
          Hi ${businessName},<br/><br/>
          This is a friendly reminder that your FlippedPOS subscription or trial is expiring in <strong>7 days</strong> on <strong>${new Date(expiryDate).toLocaleDateString()}</strong>.
        </p>
        <p style="color:#a1a1aa;font-size:15px;line-height:1.6;margin:0 0 24px;">
          To avoid any interruption to your service, please log in to your portal and generate a new subscription invoice.
        </p>
        <a href="${portalUrl}/account/billing" style="display:inline-block;background:#ffffff;color:#000000;text-decoration:none;padding:12px 24px;border-radius:6px;font-weight:bold;font-size:14px;">Renew Subscription</a>
        <p style="color:#52525b;font-size:12px;margin-top:32px;">If you've already made a payment, please disregard this email.</p>
      </div>
    </div>
  `;
  try {
    await transporter.sendMail({
      from: fromAddress,
      to: email,
      subject: 'Action Required: Your FlippedPOS subscription is expiring soon',
      html,
    });
  } catch (error) {
    console.error('Error sending expiry reminder email:', error);
  }
};

export const sendOrderStatusEmail = async (email, orderNumber, newStatus, trackingNumber = null) => {
  const statusColor = newStatus === 'delivered' ? '#16a34a' : 
                      newStatus === 'shipped' ? '#9333ea' : 
                      newStatus === 'cancelled' ? '#dc2626' : 
                      newStatus === 'processing' ? '#eab308' : '#3b82f6';
                      
  const statusText = newStatus.charAt(0).toUpperCase() + newStatus.slice(1);
  
  const html = `
    <div style="font-family:sans-serif;max-width:600px;margin:auto;background:#09090b;color:#e4e4e7;border:1px solid #27272a;border-radius:12px;overflow:hidden;">
      <div style="padding:32px;">
        <h2 style="color:#ffffff;margin:0 0 16px;">Order Status Update</h2>
        <p style="color:#a1a1aa;font-size:15px;line-height:1.6;margin:0 0 24px;">
          Your order <strong>#${orderNumber}</strong> has been updated.
        </p>
        <div style="margin-bottom:24px;background:#18181b;border:1px solid #27272a;border-radius:8px;padding:16px;">
          <table style="width:100%;border-collapse:collapse;">
            <tr><td style="padding:8px 0;color:#71717a;font-size:13px;width:120px;">Order Number</td><td style="padding:8px 0;color:#e4e4e7;font-size:13px;">${orderNumber}</td></tr>
            <tr><td style="padding:8px 0;color:#71717a;font-size:13px;">New Status</td><td style="padding:8px 0;color:${statusColor};font-size:15px;font-weight:bold;">${statusText}</td></tr>
            ${trackingNumber ? `<tr><td style="padding:8px 0;color:#71717a;font-size:13px;">Tracking Number</td><td style="padding:8px 0;color:#ffffff;font-size:13px;font-family:monospace;">${trackingNumber}</td></tr>` : ''}
          </table>
        </div>
        <p style="color:#52525b;font-size:12px;margin-top:32px;">Thank you for shopping with us!</p>
      </div>
    </div>
  `;
  try {
    await transporter.sendMail({
      from: fromAddress,
      to: email,
      subject: `Order Update: #${orderNumber} is now ${statusText}`,
      html,
    });
  } catch (error) {
    console.error('Error sending order status email:', error);
  }
};
