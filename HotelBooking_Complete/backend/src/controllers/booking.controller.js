import pool from '../config/db.js';
import { createBooking } from '../services/booking.service.js';
import { HttpError } from '../utils/httpError.js';

export async function create(req, res) {
  const booking = await createBooking({ user: req.user, body: req.body });
  res.status(201).json({ message: 'Đã tạo đơn đặt phòng. Tiếp tục thanh toán để xác nhận.', booking });
}

export async function myBookings(req, res) {
  // Keep the primary booking query simple for TiDB: fetch payment summaries
  // separately instead of joining a derived table or placing a subquery in ON.
  const [rows] = await pool.execute(
    `SELECT b.booking_id AS id, b.booking_code AS code, b.guest_name AS guestName, b.guest_email AS guestEmail,
      b.total_amount AS totalAmount, b.num_guests AS guests, b.status, b.created_at AS createdAt,
      h.name AS hotelName, rt.name AS roomName, d.check_in AS checkIn, d.check_out AS checkOut
     FROM bookings b JOIN booking_details d ON d.booking_id=b.booking_id
     JOIN rooms r ON r.room_id=d.room_id JOIN room_types rt ON rt.room_type_id=r.room_type_id
     JOIN hotels h ON h.hotel_id=b.hotel_id
     WHERE b.user_id=? ORDER BY b.created_at DESC`, [req.user.user_id],
  );

  let bookings = rows;
  if (rows.length) {
    const bookingIds = rows.map((booking) => booking.id);
    const placeholders = bookingIds.map(() => '?').join(',');
    const [payments] = await pool.execute(
      `SELECT payment_id AS paymentId, booking_id AS bookingId, status AS paymentStatus, provider AS paymentProvider
       FROM payments WHERE booking_id IN (${placeholders}) ORDER BY payment_id DESC`,
      bookingIds,
    );
    const latestPaymentByBooking = new Map();
    for (const payment of payments) {
      const key = String(payment.bookingId);
      if (!latestPaymentByBooking.has(key)) latestPaymentByBooking.set(key, payment);
    }
    bookings = rows.map((booking) => {
      const payment = latestPaymentByBooking.get(String(booking.id));
      return {
        ...booking,
        paymentStatus: payment?.paymentStatus || null,
        paymentProvider: payment?.paymentProvider || null,
      };
    });
  }

  res.json({ bookings });
}

export async function getByCode(req, res) {
  const email = String(req.query.email || '').trim().toLowerCase();
  if (!email) throw new HttpError(400, 'Cần cung cấp email đặt phòng để tra cứu.', 'EMAIL_REQUIRED');
  const [rows] = await pool.execute(
    `SELECT b.booking_code AS code, b.guest_name AS guestName, b.guest_email AS guestEmail,
      b.guest_phone AS guestPhone, b.total_amount AS totalAmount, b.status,
      h.name AS hotelName, rt.name AS roomName, d.check_in AS checkIn, d.check_out AS checkOut,
      p.status AS paymentStatus, p.provider AS paymentProvider
     FROM bookings b JOIN booking_details d ON d.booking_id=b.booking_id
     JOIN rooms r ON r.room_id=d.room_id JOIN room_types rt ON rt.room_type_id=r.room_type_id
     JOIN hotels h ON h.hotel_id=b.hotel_id LEFT JOIN payments p ON p.booking_id=b.booking_id
     WHERE b.booking_code=? AND b.guest_email=? ORDER BY p.payment_id DESC LIMIT 1`, [req.params.code, email],
  );
  if (!rows.length) throw new HttpError(404, 'Không tìm thấy đơn với mã và email này.', 'BOOKING_NOT_FOUND');
  res.json({ booking: rows[0] });
}

export async function cancel(req, res) {
  const [rows] = await pool.execute('SELECT booking_id, user_id, status FROM bookings WHERE booking_id=? LIMIT 1', [Number(req.params.id)]);
  if (!rows.length) throw new HttpError(404, 'Không tìm thấy đơn đặt phòng.', 'BOOKING_NOT_FOUND');
  if (req.user.role === 'customer' && Number(rows[0].user_id) !== Number(req.user.user_id)) throw new HttpError(403, 'Bạn không có quyền hủy đơn này.', 'FORBIDDEN');
  if (req.user.role === 'customer' && rows[0].status !== 'pending') throw new HttpError(400, 'Đơn đã xác nhận cần liên hệ khách sạn để được hỗ trợ hủy.', 'CONTACT_HOTEL_TO_CANCEL');
  if (['checked_in', 'checked_out', 'cancelled'].includes(rows[0].status)) throw new HttpError(400, 'Không thể hủy đơn ở trạng thái hiện tại.', 'BOOKING_CANNOT_CANCEL');
  await pool.execute("UPDATE bookings SET status='cancelled', cancelled_at=UTC_TIMESTAMP() WHERE booking_id=?", [Number(req.params.id)]);
  await pool.execute("UPDATE payments SET status='failed' WHERE booking_id=? AND status='pending'", [Number(req.params.id)]);
  res.json({ message: 'Đã hủy đơn đặt phòng.' });
}
