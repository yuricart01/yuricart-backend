const SibApiV3Sdk = require("sib-api-v3-sdk");
const { env } = require("../config/env");

let defaultClient = null;
let apiInstance = null;

function initBrevo() {
  if (defaultClient) return true;
  if (!env.BREVO_API_KEY) {
    console.warn("Email not sent — BREVO_API_KEY not configured.");
    return false;
  }
  defaultClient = SibApiV3Sdk.ApiClient.instance;
  const apiKey = defaultClient.authentications["api-key"];
  apiKey.apiKey = env.BREVO_API_KEY;
  apiInstance = new SibApiV3Sdk.TransactionalEmailsApi();
  return true;
}

async function sendMail({ to, subject, html }) {
  if (!initBrevo()) return;
  try {
    const sendSmtpEmail = new SibApiV3Sdk.SendSmtpEmail();
    sendSmtpEmail.to = [{ email: to }];
    sendSmtpEmail.sender = {
      name: env.BREVO_FROM_NAME,
      email: env.BREVO_FROM_EMAIL,
    };
    sendSmtpEmail.subject = subject;
    sendSmtpEmail.htmlContent = html;
    await apiInstance.sendTransacEmail(sendSmtpEmail);
  } catch (error) {
    console.error("Failed to send email:", error.message);
  }
}

function orderStatusEmailHtml(order, newStatus) {
  const itemsHtml = order.items
    .map(
      (item) =>
        `<tr><td style="padding:6px 12px;border-bottom:1px solid #eee">${item.title}</td><td style="padding:6px 12px;border-bottom:1px solid #eee;text-align:center">${item.quantity}</td><td style="padding:6px 12px;border-bottom:1px solid #eee;text-align:right">KES ${(item.price * item.quantity).toLocaleString()}</td></tr>`,
    )
    .join("");

  return `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"></head>
<body style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;padding:20px">
  <h2 style="color:#333">Order Status Update</h2>
  <p>Hi <strong>${order.customerName}</strong>,</p>
  <p>The status of your order <strong>#${order.orderNumber}</strong> has been updated to:</p>
  <p style="font-size:18px;font-weight:bold;color:#2563eb;text-transform:capitalize">${newStatus}</p>
  <table style="width:100%;border-collapse:collapse;margin:16px 0">
    <thead><tr style="background:#f3f4f6"><th style="padding:8px 12px;text-align:left">Item</th><th style="padding:8px 12px;text-align:center">Qty</th><th style="padding:8px 12px;text-align:right">Price</th></tr></thead>
    <tbody>${itemsHtml}</tbody>
  </table>
  <p style="font-size:16px"><strong>Total: KES ${order.total.toLocaleString()}</strong></p>
  <p style="color:#666;margin-top:24px">Thank you for shopping with Yuricart!</p>
</body>
</html>`;
}

function orderConfirmationEmailHtml(order) {
  const itemsHtml = order.items
    .map(
      (item) =>
        `<tr><td style="padding:6px 12px;border-bottom:1px solid #eee">${item.title}</td><td style="padding:6px 12px;border-bottom:1px solid #eee;text-align:center">${item.quantity}</td><td style="padding:6px 12px;border-bottom:1px solid #eee;text-align:right">KES ${(item.price * item.quantity).toLocaleString()}</td></tr>`,
    )
    .join("");

  return `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"></head>
<body style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;padding:20px">
  <h2 style="color:#333">Order Confirmed!</h2>
  <p>Hi <strong>${order.customerName}</strong>,</p>
  <p>Thank you for your order! Your order <strong>#${order.orderNumber}</strong> has been placed successfully.</p>
  <table style="width:100%;border-collapse:collapse;margin:16px 0">
    <thead><tr style="background:#f3f4f6"><th style="padding:8px 12px;text-align:left">Item</th><th style="padding:8px 12px;text-align:center">Qty</th><th style="padding:8px 12px;text-align:right">Price</th></tr></thead>
    <tbody>${itemsHtml}</tbody>
  </table>
  <p style="font-size:16px"><strong>Total: KES ${order.total.toLocaleString()}</strong></p>
  <p style="color:#666;margin-top:24px">We will notify you when your order status changes.</p>
  <p style="color:#666">Thank you for shopping with Yuricart!</p>
</body>
</html>`;
}

function productRequestEmailHtml({ customerName, customerEmail, productName, quantity, message }) {
  return `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"></head>
<body style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;padding:20px">
  <h2 style="color:#333">New Product Request</h2>
  <p>A customer has requested a product:</p>
  <table style="width:100%;border-collapse:collapse;margin:16px 0">
    <tr><td style="padding:6px 12px;font-weight:bold">Customer Name</td><td style="padding:6px 12px">${customerName}</td></tr>
    <tr><td style="padding:6px 12px;font-weight:bold">Customer Email</td><td style="padding:6px 12px">${customerEmail}</td></tr>
    <tr><td style="padding:6px 12px;font-weight:bold">Product Name</td><td style="padding:6px 12px">${productName}</td></tr>
    ${quantity ? `<tr><td style="padding:6px 12px;font-weight:bold">Requested Quantity</td><td style="padding:6px 12px">${quantity}</td></tr>` : ""}
    ${message ? `<tr><td style="padding:6px 12px;font-weight:bold">Message</td><td style="padding:6px 12px">${message}</td></tr>` : ""}
  </table>
</body>
</html>`;
}

async function sendOrderConfirmationEmail(order) {
  if (!order.email) return;
  await sendMail({
    to: order.email,
    subject: `Order Confirmed — #${order.orderNumber}`,
    html: orderConfirmationEmailHtml(order),
  });
}

async function sendOrderStatusEmail(order, newStatus) {
  if (!order.email) return;
  await sendMail({
    to: order.email,
    subject: `Order ${newStatus.charAt(0).toUpperCase() + newStatus.slice(1)} — #${order.orderNumber}`,
    html: orderStatusEmailHtml(order, newStatus),
  });
}

async function sendProductRequestEmail({ customerName, customerEmail, productName, quantity, message }) {
  const adminEmail = env.ADMIN_EMAIL;
  if (!adminEmail) {
    console.warn("ADMIN_EMAIL not set — cannot send product request notification.");
    return;
  }
  await sendMail({
    to: adminEmail,
    subject: `New Product Request from ${customerName}`,
    html: productRequestEmailHtml({ customerName, customerEmail, productName, quantity, message }),
  });

  if (customerEmail) {
    await sendMail({
      to: customerEmail,
      subject: "We received your product request",
      html: `<p>Hi <strong>${customerName}</strong>,</p><p>Thank you for your interest in <strong>${productName}</strong>. We have received your request and will notify you when it becomes available.</p><p>Best regards,<br/>Yuricart Team</p>`,
    });
  }
}

module.exports = {
  sendOrderConfirmationEmail,
  sendOrderStatusEmail,
  sendProductRequestEmail,
};
