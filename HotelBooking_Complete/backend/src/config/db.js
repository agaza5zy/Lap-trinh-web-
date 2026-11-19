import mysql from 'mysql2/promise';

const sslEnabled = String(process.env.DB_SSL || 'false').toLowerCase() === 'true';
const ssl = sslEnabled ? {
  rejectUnauthorized: String(process.env.DB_SSL_REJECT_UNAUTHORIZED || 'true').toLowerCase() !== 'false',
  ...(process.env.DB_SSL_CA ? { ca: process.env.DB_SSL_CA.replace(/\\n/g, '\n') } : {}),
} : undefined;

const isVercel = process.env.VERCEL === '1';
const pool = mysql.createPool({
  host: process.env.DB_HOST || '127.0.0.1',
  port: Number(process.env.DB_PORT || 3306),
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'hotel_booking',
  waitForConnections: true,
  connectionLimit: Number(process.env.DB_CONNECTION_LIMIT || (isVercel ? 3 : 12)),
  queueLimit: 0,
  decimalNumbers: true,
  dateStrings: true,
  timezone: 'Z',
  charset: 'utf8mb4',
  enableKeepAlive: true,
  connectTimeout: 10000,
  ...(ssl ? { ssl } : {}),
});

export default pool;
