import { Resend } from 'resend';
import dotenv from 'dotenv';
dotenv.config();

const resend = new Resend(process.env.RESEND_API_KEY);
const fromAddress = process.env.EMAIL_FROM || 'FlippedPOS <notifications@flippedpos.com>';

export const sendWelcomeEmail = async (email, businessName, customerCode, schemaName, tenantSlug, trialEndsAt) => {
  const portalUrl = process.env.APP_URL || 'https://flippedpos.com';
  const posUrl = `${process.env.APP_BASE_URL || 'https://app.flippedpos.com'}${tenantSlug ? '/' + tenantSlug : ''}/admin`;
  const trialRow = trialEndsAt
    ? `<tr><td style="padding:8px 0;color:#71717a;font-size:13px;">Trial Ends</td><td style="padding:8px 0;color:#e4e4e7;font-size:13px;">${new Date(trialEndsAt).toLocaleDateString()}</td></tr>`
    : '';
  const html = `
    <div style="font-family:sans-serif;max-width:600px;margin:auto;background:#1f1f1f;color:#e4e4e7;border:1px solid #3a3a3a;border-radius:12px;overflow:hidden;">
      <div style="padding:32px;">
        <h2 style="color:#ffffff;margin:0 0 16px;">Welcome to FlippedPOS!</h2>
        <p style="color:#a1a1aa;font-size:15px;line-height:1.6;margin:0 0 24px;">
          Hi ${businessName},<br/><br/>
          Your FlippedPOS instance has been successfully provisioned. Here are your account details:
        </p>
        <div style="margin-bottom:24px;background:#262626;border:1px solid #3a3a3a;border-radius:8px;padding:16px;">
          <table style="width:100%;border-collapse:collapse;">
            <tr><td style="padding:8px 0;color:#71717a;font-size:13px;width:120px;">Customer Code</td><td style="padding:8px 0;color:#ffffff;font-size:15px;font-weight:bold;">${customerCode}</td></tr>
            <tr><td style="padding:8px 0;color:#71717a;font-size:13px;">Login Email</td><td style="padding:8px 0;color:#e4e4e7;font-size:13px;">${email}</td></tr>
            ${tenantSlug ? `<tr><td style="padding:8px 0;color:#71717a;font-size:13px;">Your POS Link</td><td style="padding:8px 0;color:#e4e4e7;font-size:13px;"><a href="${posUrl}" style="color:#32CD32;">${posUrl}</a></td></tr>` : ''}
            <tr><td style="padding:8px 0;color:#71717a;font-size:13px;">Database Schema</td><td style="padding:8px 0;color:#e4e4e7;font-size:13px;font-family:monospace;">${schemaName}</td></tr>
            ${trialRow}
          </table>
        </div>
        <a href="${posUrl}" style="display:inline-block;background:#ffffff;color:#000000;text-decoration:none;padding:12px 24px;border-radius:6px;font-weight:bold;font-size:14px;margin-right:8px;">Open Your POS</a>
        <a href="${portalUrl}/account" style="display:inline-block;background:transparent;color:#ffffff;text-decoration:none;padding:12px 24px;border-radius:6px;font-weight:bold;font-size:14px;border:1px solid #3a3a3a;">Customer Portal</a>
        <p style="color:#52525b;font-size:12px;margin-top:32px;">If you have any questions, simply reply to this email.</p>
      </div>
    </div>
  `;
  try {
    await resend.emails.send({
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
    <div style="font-family:sans-serif;max-width:600px;margin:auto;background:#1f1f1f;color:#e4e4e7;border:1px solid #3a3a3a;border-radius:12px;overflow:hidden;">
      <div style="padding:32px;">
        <h2 style="color:#ffffff;margin:0 0 16px;">New Invoice Generated</h2>
        <p style="color:#a1a1aa;font-size:15px;line-height:1.6;margin:0 0 24px;">
          A new invoice has been generated for your account.
        </p>
        <div style="margin-bottom:24px;background:#262626;border:1px solid #3a3a3a;border-radius:8px;padding:16px;">
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
    await resend.emails.send({
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
    <div style="font-family:sans-serif;max-width:600px;margin:auto;background:#1f1f1f;color:#e4e4e7;border:1px solid #3a3a3a;border-radius:12px;overflow:hidden;">
      <div style="padding:32px;">
        <h2 style="color:#ffffff;margin:0 0 16px;">Payment Received</h2>
        <p style="color:#a1a1aa;font-size:15px;line-height:1.6;margin:0 0 24px;">
          Thank you! We have received your payment for invoice <strong>${invoiceNumber}</strong>.
        </p>
        <div style="margin-bottom:24px;background:#262626;border:1px solid #3a3a3a;border-radius:8px;padding:16px;">
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
    await resend.emails.send({
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
    <div style="font-family:sans-serif;max-width:600px;margin:auto;background:#1f1f1f;color:#e4e4e7;border:1px solid #3a3a3a;border-radius:12px;overflow:hidden;">
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
    await resend.emails.send({
      from: fromAddress,
      to: email,
      subject: 'Action Required: Your FlippedPOS subscription is expiring soon',
      html,
    });
  } catch (error) {
    console.error('Error sending expiry reminder email:', error);
  }
};

export const sendAccountExpiredEmail = async (email, businessName, tenantSlug) => {
  const portalUrl = process.env.APP_URL || 'https://flippedpos.com';
  const html = `
    <div style="font-family:sans-serif;max-width:600px;margin:auto;background:#1f1f1f;color:#e4e4e7;border:1px solid #3a3a3a;border-radius:12px;overflow:hidden;">
      <div style="padding:32px;">
        <h2 style="color:#ffffff;margin:0 0 16px;">Your FlippedPOS Subscription Has Expired</h2>
        <p style="color:#a1a1aa;font-size:15px;line-height:1.6;margin:0 0 24px;">
          Hi ${businessName},<br/><br/>
          Your FlippedPOS trial or subscription has expired and your instance${tenantSlug ? ` (<strong>${tenantSlug}</strong>)` : ''} has been suspended. Your data is safe and nothing has been deleted — access will be restored as soon as a new subscription invoice is paid.
        </p>
        <a href="${portalUrl}/account/billing" style="display:inline-block;background:#ffffff;color:#000000;text-decoration:none;padding:12px 24px;border-radius:6px;font-weight:bold;font-size:14px;">Renew Now</a>
        <p style="color:#52525b;font-size:12px;margin-top:32px;">If you believe this is a mistake, simply reply to this email.</p>
      </div>
    </div>
  `;
  try {
    await resend.emails.send({
      from: fromAddress,
      to: email,
      subject: 'Action Required: Your FlippedPOS subscription has expired',
      html,
    });
  } catch (error) {
    console.error('Error sending account expired email:', error);
  }
};

export const sendPasswordResetEmail = async (email, resetLink) => {
  const html = `
    <div style="font-family:sans-serif;max-width:600px;margin:auto;background:#1f1f1f;color:#e4e4e7;border:1px solid #3a3a3a;border-radius:12px;overflow:hidden;">
      <div style="padding:32px;">
        <h2 style="color:#ffffff;margin:0 0 16px;">Password Reset Request</h2>
        <p style="color:#a1a1aa;font-size:15px;line-height:1.6;margin:0 0 24px;">
          Click the link below to reset your password. It expires in 1 hour.
        </p>
        <a href="${resetLink}" style="display:inline-block;background:#ffffff;color:#000000;text-decoration:none;padding:12px 24px;border-radius:6px;font-weight:bold;font-size:14px;">Reset Password</a>
        <p style="color:#52525b;font-size:12px;margin-top:32px;">If you did not request this, ignore this email.</p>
      </div>
    </div>
  `;
  try {
    await resend.emails.send({
      from: fromAddress,
      to: email,
      subject: 'Password Reset — FlippedPOS',
      html,
    });
  } catch (error) {
    console.error('Error sending password reset email:', error);
  }
};

export const sendContactEnquiryEmail = async ({ name, email, phone, message }) => {
  const html = `
    <div style="font-family:sans-serif;max-width:600px;margin:auto;background:#1f1f1f;color:#e4e4e7;border:1px solid #3a3a3a;border-radius:12px;overflow:hidden;">
      <div style="background:linear-gradient(90deg,#004A99,#008B8B,#32CD32);padding:4px 0;"></div>
      <div style="padding:32px;">
        <h2 style="color:#ffffff;margin:0 0 4px;">New Website Enquiry</h2>
        <p style="color:#71717a;font-size:13px;margin:0 0 24px;">Sent from the FlippedPOS.com contact form</p>
        <table style="width:100%;border-collapse:collapse;">
          <tr><td style="padding:8px 0;color:#a1a1aa;font-size:13px;width:100px;">Name</td><td style="padding:8px 0;color:#ffffff;font-size:13px;">${name}</td></tr>
          <tr><td style="padding:8px 0;color:#a1a1aa;font-size:13px;">Email</td><td style="padding:8px 0;color:#ffffff;font-size:13px;"><a href="mailto:${email}" style="color:#32CD32;">${email}</a></td></tr>
          ${phone ? `<tr><td style="padding:8px 0;color:#a1a1aa;font-size:13px;">Phone</td><td style="padding:8px 0;color:#ffffff;font-size:13px;">${phone}</td></tr>` : ''}
        </table>
        <div style="margin-top:20px;background:#262626;border:1px solid #3a3a3a;border-radius:8px;padding:16px;">
          <p style="color:#a1a1aa;font-size:12px;margin:0 0 8px;text-transform:uppercase;letter-spacing:.05em;">Message</p>
          <p style="color:#e4e4e7;font-size:15px;line-height:1.6;margin:0;">${message.replace(/\n/g, '<br/>')}</p>
        </div>
        <p style="color:#52525b;font-size:11px;margin-top:24px;">Reply directly to this email to respond to ${name}.</p>
      </div>
    </div>
  `;
  await resend.emails.send({
    from: 'FlippedPOS Website <notifications@flippedpos.com>',
    to: 'nilehive23@gmail.com',
    replyTo: email,
    subject: `[FlippedPOS Website] New Enquiry from ${name}`,
    html,
  });
};
