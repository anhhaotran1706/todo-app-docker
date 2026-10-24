const nodemailer = require('nodemailer');

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST || 'mailpit',
  port: Number(process.env.SMTP_PORT || 1025),
  secure: process.env.SMTP_SECURE === 'true',
  auth: process.env.SMTP_USER ? { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS } : undefined,
});

function sendMail({ to, subject, html }) {
  return transporter.sendMail({ from: process.env.MAIL_FROM || 'Todo App <no-reply@todo.local>', to, subject, html });
}

module.exports = { sendMail };