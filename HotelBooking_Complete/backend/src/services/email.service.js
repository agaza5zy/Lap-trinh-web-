import { getAppUrl } from '../config/urls.js';
import nodemailer from 'nodemailer';

function getTransport() {
  if (!process.env.SMTP_HOST || !process.env.SMTP_USER || !process.env.SMTP_PASS) return null;
  return nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT || 465),
    secure: String(process.env.SMTP_SECURE || 'true') === 'true',
    auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
  });
}

export async function sendVerificationEmail({ to, name, token }) {
  const clientUrl = getAppUrl();
  const verifyUrl = `${clientUrl}/verify-email?token=${encodeURIComponent(token)}`;
  const transport = getTransport();
  if (!transport) {
    if (process.env.NODE_ENV === 'production') throw new Error('SMTP chưa được cấu hình.');
    console.info(`[VNHotel DEV] Xác minh email cho ${to}: ${verifyUrl}`);
    return { delivered: false, devVerificationUrl: verifyUrl, devVerificationToken: token };
  }
  await transport.sendMail({
    from: process.env.MAIL_FROM || process.env.SMTP_USER,
    to,
    subject: 'Xác minh tài khoản VNHotel',
    text: `Xin chào ${name},\n\nMở liên kết sau để xác minh email (hết hạn sau 30 phút):\n${verifyUrl}\n\nNếu bạn không tạo tài khoản, hãy bỏ qua email này.`,
    html: `<div style="font-family:Arial,sans-serif;max-width:560px;margin:auto;color:#17324d"><h2>Chào ${escapeHtml(name)},</h2><p>Cảm ơn bạn đã đăng ký VNHotel. Nhấn nút bên dưới để xác minh địa chỉ email.</p><p><a href="${verifyUrl}" style="display:inline-block;background:#0d756f;color:#fff;padding:13px 22px;border-radius:8px;text-decoration:none">Xác minh email</a></p><p>Liên kết hết hạn sau 30 phút. Nếu bạn không tạo tài khoản, hãy bỏ qua email này.</p></div>`,
  });
  return { delivered: true };
}

function escapeHtml(value) {
  return String(value).replace(/[&<>"']/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[char]);
}
