import pool from '../config/db.js';
import { HttpError } from '../utils/httpError.js';
import { randomToken } from '../utils/security.js';
import { SINGLE_HOTEL_CITY, validDateRange } from '../config/hotel.js';

export async function createBooking({ user, body }) {
  const roomTypeId = Number(body.roomTypeId);
  const checkIn = String(body.checkIn || '');
  const checkOut = String(body.checkOut || '');
  const numGuests = Number(body.numGuests || 1);
  if (!Number.isInteger(roomTypeId) || roomTypeId < 1) throw new HttpError(400, 'Vui lòng chọn loại phòng.', 'ROOM_REQUIRED');
  if (!validDateRange(checkIn, checkOut)) {
    throw new HttpError(400, 'Ngày nhận phòng và ngày trả phòng không hợp lệ; ngày trả phải sau ngày nhận.', 'INVALID_DATES');
  }
  if (!Number.isInteger(numGuests) || numGuests < 1 || numGuests > 12) throw new HttpError(400, 'Số khách không hợp lệ.', 'INVALID_GUESTS');
  const todayInVietnam = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Ho_Chi_Minh', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date());
  if (checkIn < todayInVietnam) throw new HttpError(400, 'Ngày nhận phòng không thể nằm trong quá khứ.', 'PAST_CHECK_IN');
  const guestName = String(body.guestName || user.full_name).trim().slice(0, 100);
  const guestEmail = String(body.guestEmail || user.email).trim().toLowerCase().slice(0, 150);
  const guestPhone = String(body.guestPhone || user.phone || '').trim().slice(0, 20);
  if (!guestName || !/^\S+@\S+\.\S+$/.test(guestEmail) || !guestPhone) {
    throw new HttpError(400, 'Vui lòng nhập họ tên, email và số điện thoại hợp lệ.', 'GUEST_INFO_REQUIRED');
  }

  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();
    const [types] = await connection.execute(
      `SELECT rt.room_type_id, rt.hotel_id, rt.name, rt.max_guests, rt.base_price, h.name AS hotel_name
       FROM room_types rt JOIN hotels h ON h.hotel_id = rt.hotel_id
       WHERE rt.room_type_id = ? AND rt.status = 'active' AND h.status = 'active' AND h.city = ? FOR UPDATE`,
      [roomTypeId, SINGLE_HOTEL_CITY],
    );
    if (!types.length) throw new HttpError(404, 'Loại phòng không tồn tại hoặc đang ngừng kinh doanh.', 'ROOM_TYPE_NOT_FOUND');
    const roomType = types[0];
    if (numGuests > roomType.max_guests) throw new HttpError(400, `Loại phòng này chỉ nhận tối đa ${roomType.max_guests} khách.`, 'GUEST_LIMIT');

    const [available] = await connection.execute(
      `SELECT r.room_id FROM rooms r
       WHERE r.room_type_id = ? AND r.hotel_id = ? AND r.status = 'available'
         AND NOT EXISTS (
           SELECT 1 FROM booking_details d JOIN bookings b ON b.booking_id = d.booking_id
           WHERE d.room_id = r.room_id AND b.status <> 'cancelled'
             AND d.check_in < ? AND d.check_out > ?
         )
       ORDER BY r.room_id LIMIT 1 FOR UPDATE`,
      [roomTypeId, roomType.hotel_id, checkOut, checkIn],
    );
    if (!available.length) throw new HttpError(409, 'Rất tiếc, loại phòng này đã hết phòng trong khoảng ngày bạn chọn.', 'ROOM_UNAVAILABLE');

    let promotionId = null;
    let discountAmount = 0;
    if (body.promotionCode) {
      const [promotions] = await connection.execute(
        `SELECT * FROM promotions WHERE code = ? AND is_active = 1 AND start_date <= CURDATE()
          AND end_date >= CURDATE() AND (usage_limit IS NULL OR used_count < usage_limit) FOR UPDATE`,
        [String(body.promotionCode).trim().toUpperCase()],
      );
      if (!promotions.length) throw new HttpError(400, 'Mã khuyến mãi không hợp lệ hoặc đã hết hạn.', 'INVALID_PROMOTION');
      const promotion = promotions[0];
      const nights = Math.round((Date.parse(`${checkOut}T00:00:00Z`) - Date.parse(`${checkIn}T00:00:00Z`)) / 86400000);
      const subtotal = Number(roomType.base_price) * nights;
      if (subtotal < Number(promotion.min_order_amount)) throw new HttpError(400, 'Đơn hàng chưa đạt giá trị tối thiểu của mã khuyến mãi.', 'PROMOTION_MIN_ORDER');
      promotionId = promotion.promotion_id;
      discountAmount = promotion.discount_type === 'percent'
        ? Math.min(Math.round(subtotal * Number(promotion.discount_value) / 100), Number(promotion.max_discount || subtotal))
        : Math.min(Number(promotion.discount_value), subtotal);
      await connection.execute('UPDATE promotions SET used_count = used_count + 1 WHERE promotion_id = ?', [promotionId]);
    }

    const nights = Math.round((Date.parse(`${checkOut}T00:00:00Z`) - Date.parse(`${checkIn}T00:00:00Z`)) / 86400000);
    const subtotalRooms = Number(roomType.base_price) * nights;
    const totalAmount = subtotalRooms - discountAmount;
    if (totalAmount <= 0) throw new HttpError(400, 'Giá trị đơn sau khuyến mãi phải lớn hơn 0.', 'INVALID_TOTAL');
    const bookingCode = `VH${Date.now().toString(36).toUpperCase()}${randomToken(3).toUpperCase()}`.slice(0, 20);
    const [bookingResult] = await connection.execute(
      `INSERT INTO bookings (booking_code, hotel_id, user_id, promotion_id, guest_name, guest_email,
        guest_phone, note, num_guests, subtotal_rooms, subtotal_services, discount_amount, total_amount, status)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0, ?, ?, 'pending')`,
      [bookingCode, roomType.hotel_id, user.user_id, promotionId, guestName, guestEmail, guestPhone,
        String(body.note || '').slice(0, 500) || null, numGuests, subtotalRooms, discountAmount, totalAmount],
    );
    await connection.execute(
      `INSERT INTO booking_details (booking_id, hotel_id, room_id, check_in, check_out, price_per_night)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [bookingResult.insertId, roomType.hotel_id, available[0].room_id, checkIn, checkOut, roomType.base_price],
    );
    await connection.commit();
    return {
      bookingId: bookingResult.insertId,
      bookingCode,
      hotelName: roomType.hotel_name,
      roomName: roomType.name,
      checkIn,
      checkOut,
      nights,
      numGuests,
      subtotalRooms,
      discountAmount,
      totalAmount,
      status: 'pending',
    };
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
}
