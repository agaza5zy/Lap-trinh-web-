import jwt from 'jsonwebtoken';
import pool from '../config/db.js';

export async function authenticate(req, res, next) {
  try {
    const header = req.headers.authorization || '';
    const token = header.startsWith('Bearer ') ? header.slice(7) : '';
    if (!token) return res.status(401).json({ message: 'Vui lòng đăng nhập để tiếp tục.', code: 'UNAUTHORIZED' });
    const payload = jwt.verify(token, process.env.JWT_SECRET, {
      issuer: 'vnhotel-api', audience: 'vnhotel-web',
    });
    const [rows] = await pool.execute(
      `SELECT user_id, full_name, email, phone, role, status, email_verified, auth_provider
       FROM users WHERE user_id = ? LIMIT 1`, [Number(payload.sub)],
    );
    if (!rows.length || rows[0].status !== 'active') {
      return res.status(401).json({ message: 'Tài khoản không tồn tại hoặc đã bị khóa.', code: 'ACCOUNT_LOCKED' });
    }
    req.user = rows[0];
    next();
  } catch (error) {
    if (error.name === 'JsonWebTokenError' || error.name === 'TokenExpiredError') {
      return res.status(401).json({ message: 'Phiên đăng nhập không hợp lệ hoặc đã hết hạn.', code: 'INVALID_TOKEN' });
    }
    next(error);
  }
}

export function optionalAuth(req, _res, next) {
  const header = req.headers.authorization || '';
  if (!header.startsWith('Bearer ')) return next();
  jwt.verify(header.slice(7), process.env.JWT_SECRET, { issuer: 'vnhotel-api', audience: 'vnhotel-web' }, (err, payload) => {
    if (!err && payload?.sub) req.optionalUserId = Number(payload.sub);
    next();
  });
}
