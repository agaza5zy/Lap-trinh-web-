import 'dotenv/config';
import app from './app.js';
import pool from './config/db.js';

const PORT = Number(process.env.PORT || 5000);
try {
  await pool.query('SELECT 1');
  console.log('MySQL đã kết nối.');
} catch (error) {
  console.error('Không thể kết nối MySQL:', error.message);
  process.exit(1);
}
app.listen(PORT, () => console.log(`VNHotel API đang chạy tại http://localhost:${PORT}`));
