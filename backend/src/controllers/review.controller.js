import pool from '../config/db.js';
import { HttpError } from '../utils/httpError.js';
import { SINGLE_HOTEL_CITY } from '../config/hotel.js';

export async function listReviews(req, res) {
  const [rows] = await pool.execute(
    `SELECT rv.rating, rv.comment, rv.created_at AS createdAt, u.full_name AS guestName
     FROM reviews rv JOIN users u ON u.user_id=rv.user_id JOIN hotels h ON h.hotel_id=rv.hotel_id
     WHERE rv.hotel_id=? AND h.city=? AND rv.status='visible' ORDER BY rv.created_at DESC LIMIT 50`, [Number(req.params.hotelId), SINGLE_HOTEL_CITY],
  );
  res.json({ reviews: rows });
}

export async function createReview(req, res) {
  const bookingId = Number(req.body.bookingId);
  const rating = Number(req.body.rating);
  const comment = String(req.body.comment || '').slice(0, 2000);
  if (!bookingId || !Number.isInteger(rating) || rating < 1 || rating > 5) throw new HttpError(400, 'Đánh giá không hợp lệ.', 'INVALID_REVIEW');
  const [rows] = await pool.execute("SELECT b.booking_id, b.user_id, b.hotel_id, b.status FROM bookings b JOIN hotels h ON h.hotel_id=b.hotel_id WHERE b.booking_id=? AND b.user_id=? AND h.city=? LIMIT 1", [bookingId, req.user.user_id, SINGLE_HOTEL_CITY]);
  if (!rows.length || rows[0].status !== 'checked_out') throw new HttpError(403, 'Chỉ có thể đánh giá sau khi hoàn tất lưu trú.', 'REVIEW_NOT_ALLOWED');
  await pool.execute('INSERT INTO reviews (booking_id, user_id, hotel_id, rating, comment) VALUES (?, ?, ?, ?, ?)', [bookingId, req.user.user_id, rows[0].hotel_id, rating, comment || null]);
  res.status(201).json({ message: 'Cảm ơn bạn đã đánh giá.' });
}
