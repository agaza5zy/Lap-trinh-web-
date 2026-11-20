import crypto from 'node:crypto';
import jwt from 'jsonwebtoken';
import { HttpError } from './httpError.js';

export const sha256 = (value) => crypto.createHash('sha256').update(value).digest('hex');
export const randomToken = (bytes = 32) => crypto.randomBytes(bytes).toString('hex');
export const hmacSha256 = (key, value) => crypto.createHmac('sha256', key).update(value).digest('hex');
export const safeEqual = (a, b) => {
  const left = Buffer.from(String(a || ''), 'utf8');
  const right = Buffer.from(String(b || ''), 'utf8');
  return left.length === right.length && crypto.timingSafeEqual(left, right);
};

export function createAccessToken(user) {
  if (!process.env.JWT_SECRET || process.env.JWT_SECRET.length < 32) {
    throw new Error('JWT_SECRET phải có ít nhất 32 ký tự.');
  }
  return jwt.sign({ role: user.role }, process.env.JWT_SECRET, {
    subject: String(user.user_id),
    expiresIn: process.env.JWT_EXPIRES_IN || '7d',
    issuer: 'vnhotel-api',
    audience: 'vnhotel-web',
  });
}

export function publicUser(user) {
  return {
    id: user.user_id,
    fullName: user.full_name,
    email: user.email,
    phone: user.phone || '',
    role: user.role,
    authProvider: user.auth_provider || 'local',
    emailVerified: Boolean(user.email_verified),
  };
}

export function requireString(value, field, max = 255) {
  if (typeof value !== 'string' || !value.trim() || value.trim().length > max) {
    throw new HttpError(400, `${field} không hợp lệ.`, 'VALIDATION_ERROR');
  }
  return value.trim();
}
