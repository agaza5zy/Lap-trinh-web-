import 'dotenv/config';
import bcrypt from 'bcryptjs';
import pool from '../src/config/db.js';

const email = process.env.SEED_ADMIN_EMAIL || 'admin@vnhotel.vn';
const password = process.env.SEED_ADMIN_PASSWORD || 'Admin@12345';
const hash = await bcrypt.hash(password, 12);
const [rows] = await pool.execute('SELECT user_id FROM users WHERE email=? LIMIT 1', [email]);
if (rows.length) {
  await pool.execute("UPDATE users SET password_hash=?, role='admin', status='active', email_verified=1 WHERE user_id=?", [hash, rows[0].user_id]);
} else {
  await pool.execute("INSERT INTO users (full_name,email,password_hash,role,status,email_verified,auth_provider) VALUES ('Quản trị viên',?,?, 'admin','active',1,'local')", [email, hash]);
}
console.log(`Admin ready: ${email}`);
if (!process.env.SEED_ADMIN_PASSWORD) console.log('Mật khẩu mặc định: Admin@12345 (hãy đổi ngay sau lần đăng nhập đầu tiên).');
await pool.end();
