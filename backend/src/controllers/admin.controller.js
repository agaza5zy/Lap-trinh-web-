import pool from '../config/db.js';
import { SINGLE_HOTEL_CITY } from '../config/hotel.js';
import { HttpError } from '../utils/httpError.js';

export async function stats(_req, res) {
  const [countRows] = await pool.execute(
    `SELECT
      (SELECT COUNT(*) FROM bookings b JOIN hotels h ON h.hotel_id=b.hotel_id WHERE h.city=? AND b.status <> 'cancelled') AS totalBookings,
      (SELECT COUNT(*) FROM bookings b JOIN hotels h ON h.hotel_id=b.hotel_id WHERE h.city=? AND b.status = 'pending') AS pendingBookings,
      (SELECT COUNT(*) FROM rooms r JOIN hotels h ON h.hotel_id=r.hotel_id WHERE h.city=? AND r.status = 'available') AS availableRooms,
      (SELECT COUNT(*) FROM users WHERE role = 'customer' AND status = 'active') AS totalCustomers,
      (SELECT COALESCE(SUM(p.amount),0) FROM payments p JOIN bookings b ON b.booking_id=p.booking_id JOIN hotels h ON h.hotel_id=b.hotel_id WHERE h.city=? AND p.status = 'paid') AS revenue`,
    [SINGLE_HOTEL_CITY, SINGLE_HOTEL_CITY, SINGLE_HOTEL_CITY, SINGLE_HOTEL_CITY],
  );
  const [monthly] = await pool.execute(
    `SELECT DATE_FORMAT(p.paid_at, '%Y-%m') AS month, SUM(p.amount) AS revenue
     FROM payments p JOIN bookings b ON b.booking_id=p.booking_id JOIN hotels h ON h.hotel_id=b.hotel_id
     WHERE h.city=? AND p.status='paid' AND p.paid_at >= DATE_SUB(CURDATE(), INTERVAL 6 MONTH)
     GROUP BY DATE_FORMAT(p.paid_at, '%Y-%m') ORDER BY month`,
    [SINGLE_HOTEL_CITY],
  );
  const counts = countRows[0] || {};
  res.json({
    stats: {
      ...counts,
      totalBookings: Number(counts.totalBookings || 0),
      pendingBookings: Number(counts.pendingBookings || 0),
      availableRooms: Number(counts.availableRooms || 0),
      totalCustomers: Number(counts.totalCustomers || 0),
      revenue: Number(counts.revenue || 0),
    },
    monthlyRevenue: monthly.map((row) => ({ month: row.month, revenue: Number(row.revenue) })),
  });
}

export async function listHotels(_req, res) {
  const [rows] = await pool.execute(
    `SELECT h.hotel_id AS id, h.name, h.address, h.city, h.star_rating AS stars,
      h.description, h.status,
      (SELECT COUNT(*) FROM rooms r WHERE r.hotel_id=h.hotel_id) AS totalRooms,
      (SELECT url FROM hotel_images i WHERE i.hotel_id=h.hotel_id ORDER BY i.sort_order LIMIT 1) AS image
     FROM hotels h WHERE h.city=? ORDER BY h.hotel_id LIMIT 1`,
    [SINGLE_HOTEL_CITY],
  );
  res.json({ hotels: rows });
}

export async function listBookings(_req, res) {
  const [rows] = await pool.execute(
    `SELECT b.booking_id AS id, b.booking_code AS code, b.guest_name AS guestName, b.guest_email AS guestEmail,
      b.guest_phone AS guestPhone, b.num_guests AS guests, b.total_amount AS totalAmount, b.status,
      b.created_at AS createdAt, h.name AS hotelName, rt.name AS roomName, d.check_in AS checkIn, d.check_out AS checkOut,
      p.status AS paymentStatus, p.provider AS paymentProvider, p.payment_id AS paymentId
     FROM bookings b JOIN booking_details d ON d.booking_id=b.booking_id
     JOIN rooms r ON r.room_id=d.room_id JOIN room_types rt ON rt.room_type_id=r.room_type_id
     JOIN hotels h ON h.hotel_id=b.hotel_id
     LEFT JOIN (SELECT booking_id, MAX(payment_id) AS payment_id FROM payments GROUP BY booking_id) latest_payment
       ON latest_payment.booking_id=b.booking_id
     LEFT JOIN payments p ON p.payment_id=latest_payment.payment_id
     WHERE h.city=? ORDER BY b.created_at DESC LIMIT 300`,
    [SINGLE_HOTEL_CITY],
  );
  res.json({ bookings: rows });
}

// Reservation approval happens when payment is verified (gateway callback or receptionist confirmation).
// Staff only advances the stay lifecycle: check-in, check-out, or cancellation.
export async function updateBookingStatus(req, res) {
  const status = String(req.body.status || '');
  if (!['checked_in', 'checked_out', 'cancelled'].includes(status)) {
    throw new HttpError(400, 'Lễ tân chỉ có thể nhận phòng, trả phòng hoặc hủy đơn. Đơn được xác nhận sau khi thanh toán hợp lệ.', 'INVALID_STATUS');
  }

  const bookingId = Number(req.params.id);
  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();
    const [bookings] = await connection.execute(
      `SELECT b.booking_id, b.status FROM bookings b JOIN hotels h ON h.hotel_id=b.hotel_id
       WHERE b.booking_id=? AND h.city=? LIMIT 1 FOR UPDATE`,
      [bookingId, SINGLE_HOTEL_CITY],
    );
    if (!bookings.length) throw new HttpError(404, 'Không tìm thấy đơn đặt phòng tại VNHotel Đà Lạt.', 'BOOKING_NOT_FOUND');
    const current = bookings[0].status;
    if (current === status) {
      await connection.commit();
      return res.json({ message: 'Đơn đã ở trạng thái này.' });
    }

    if (status === 'checked_in') {
      if (current !== 'confirmed') throw new HttpError(400, 'Chỉ nhận phòng khi đơn đã được xác nhận thanh toán.', 'BOOKING_NOT_CONFIRMED');
      const [paid] = await connection.execute("SELECT payment_id FROM payments WHERE booking_id=? AND status='paid' LIMIT 1", [bookingId]);
      if (!paid.length) throw new HttpError(400, 'Chưa có giao dịch thanh toán hợp lệ cho đơn này.', 'PAYMENT_NOT_PAID');
    }
    if (status === 'checked_out' && current !== 'checked_in') {
      throw new HttpError(400, 'Chỉ có thể trả phòng sau khi khách đã nhận phòng.', 'CHECK_IN_REQUIRED');
    }
    if (status === 'cancelled' && ['checked_in', 'checked_out', 'cancelled'].includes(current)) {
      throw new HttpError(400, 'Không thể hủy đơn ở trạng thái hiện tại.', 'BOOKING_CANNOT_CANCEL');
    }
    if (status === 'cancelled' && current === 'confirmed') {
      const [paid] = await connection.execute("SELECT payment_id FROM payments WHERE booking_id=? AND status='paid' LIMIT 1", [bookingId]);
      if (paid.length) throw new HttpError(400, 'Đơn đã thanh toán. Cần xử lý hoàn tiền trước khi hủy đơn.', 'REFUND_REQUIRED');
    }

    await connection.execute(
      `UPDATE bookings SET status=?, cancelled_at=IF(?='cancelled',UTC_TIMESTAMP(),NULL) WHERE booking_id=?`,
      [status, status, bookingId],
    );
    if (status === 'cancelled') {
      await connection.execute("UPDATE payments SET status='failed' WHERE booking_id=? AND status='pending'", [bookingId]);
    }
    await connection.commit();
    res.json({ message: status === 'checked_in' ? 'Đã ghi nhận khách nhận phòng.' : status === 'checked_out' ? 'Đã ghi nhận khách trả phòng.' : 'Đã hủy đơn đặt phòng.' });
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
}

export async function listRooms(_req, res) {
  const [rows] = await pool.execute(
    `SELECT r.room_id AS id, r.room_number AS roomNumber, r.floor, r.status AS roomStatus,
      rt.room_type_id AS roomTypeId, rt.name AS name, rt.base_price AS price, rt.max_guests AS maxGuests,
      h.hotel_id AS hotelId, h.name AS hotelName, h.city
     FROM rooms r JOIN room_types rt ON rt.room_type_id=r.room_type_id
     JOIN hotels h ON h.hotel_id=r.hotel_id
     WHERE h.city=? ORDER BY r.room_number`,
    [SINGLE_HOTEL_CITY],
  );
  res.json({ rooms: rows });
}

export async function createRoomType(req, res) {
  const name = String(req.body.name || '').trim();
  const price = Number(req.body.price);
  const maxGuests = Number(req.body.maxGuests || 2);
  const area = req.body.area ? Number(req.body.area) : null;
  const roomNumber = String(req.body.roomNumber || '').trim();
  if (!name || !Number.isFinite(price) || price < 0 || !Number.isInteger(maxGuests) || maxGuests < 1 || maxGuests > 12 || !roomNumber) {
    throw new HttpError(400, 'Vui lòng nhập tên loại phòng, giá, sức chứa và số phòng đầu tiên hợp lệ.', 'INVALID_ROOM_INPUT');
  }

  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();
    const [hotels] = await connection.execute(
      "SELECT hotel_id FROM hotels WHERE city=? AND status='active' ORDER BY hotel_id LIMIT 1 FOR UPDATE",
      [SINGLE_HOTEL_CITY],
    );
    if (!hotels.length) throw new HttpError(404, 'Chưa có khách sạn VNHotel Đà Lạt đang hoạt động trong cơ sở dữ liệu.', 'HOTEL_NOT_FOUND');
    const hotelId = hotels[0].hotel_id;
    const [typeResult] = await connection.execute(
      `INSERT INTO room_types (hotel_id, name, description, max_guests, area_m2, base_price, bed_type, status)
       VALUES (?, ?, ?, ?, ?, ?, ?, 'active')`,
      [hotelId, name, String(req.body.description || '').slice(0, 2000) || null, maxGuests, area, price, String(req.body.bedType || '').slice(0, 50) || null],
    );
    const [roomResult] = await connection.execute(
      "INSERT INTO rooms (hotel_id, room_type_id, room_number, floor, status) VALUES (?, ?, ?, ?, 'available')",
      [hotelId, typeResult.insertId, roomNumber, req.body.floor ? Number(req.body.floor) : null],
    );
    if (req.body.image) {
      await connection.execute('INSERT INTO room_type_images (room_type_id, url, sort_order) VALUES (?, ?, 0)', [typeResult.insertId, String(req.body.image).slice(0, 500)]);
    }
    await connection.commit();
    res.status(201).json({ message: 'Đã tạo loại phòng và phòng vật lý đầu tiên tại VNHotel Đà Lạt.', roomTypeId: typeResult.insertId, roomId: roomResult.insertId });
  } catch (error) {
    await connection.rollback();
    if (error.code === 'ER_DUP_ENTRY') throw new HttpError(409, 'Tên loại phòng hoặc số phòng đã tồn tại tại VNHotel Đà Lạt.', 'ROOM_DUPLICATE');
    throw error;
  } finally {
    connection.release();
  }
}


export async function addRoomUnit(req, res) {
  const roomTypeId = Number(req.params.id);
  const roomNumber = String(req.body.roomNumber || '').trim();
  const floor = req.body.floor === '' || req.body.floor == null ? null : Number(req.body.floor);
  if (!Number.isInteger(roomTypeId) || roomTypeId < 1 || !roomNumber || (floor !== null && !Number.isInteger(floor))) {
    throw new HttpError(400, 'Vui lòng chọn loại phòng và nhập số phòng, tầng hợp lệ.', 'INVALID_ROOM_UNIT');
  }
  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();
    const [types] = await connection.execute(
      `SELECT rt.room_type_id, rt.hotel_id FROM room_types rt
       JOIN hotels h ON h.hotel_id=rt.hotel_id
       WHERE rt.room_type_id=? AND rt.status='active' AND h.city=? AND h.status='active'
       LIMIT 1 FOR UPDATE`,
      [roomTypeId, SINGLE_HOTEL_CITY],
    );
    if (!types.length) throw new HttpError(404, 'Không tìm thấy loại phòng đang hoạt động tại VNHotel Đà Lạt.', 'ROOM_TYPE_NOT_FOUND');
    const [result] = await connection.execute(
      "INSERT INTO rooms (hotel_id, room_type_id, room_number, floor, status) VALUES (?, ?, ?, ?, 'available')",
      [types[0].hotel_id, roomTypeId, roomNumber, floor],
    );
    await connection.commit();
    res.status(201).json({ message: 'Đã thêm phòng vật lý vào hạng phòng.', roomId: result.insertId });
  } catch (error) {
    await connection.rollback();
    if (error.code === 'ER_DUP_ENTRY') throw new HttpError(409, 'Số phòng này đã tồn tại tại VNHotel Đà Lạt.', 'ROOM_DUPLICATE');
    throw error;
  } finally {
    connection.release();
  }
}

export async function updateRoom(req, res) {
  const roomId = Number(req.params.id);
  const status = String(req.body.status || '');
  const allowed = ['available', 'cleaning', 'maintenance', 'inactive'];
  if (!allowed.includes(status)) throw new HttpError(400, 'Trạng thái phòng không hợp lệ.', 'INVALID_ROOM_STATUS');
  const [result] = await pool.execute(
    `UPDATE rooms r JOIN hotels h ON h.hotel_id=r.hotel_id SET r.status=? WHERE r.room_id=? AND h.city=?`,
    [status, roomId, SINGLE_HOTEL_CITY],
  );
  if (!result.affectedRows) throw new HttpError(404, 'Không tìm thấy phòng tại VNHotel Đà Lạt.', 'ROOM_NOT_FOUND');
  res.json({ message: 'Đã cập nhật trạng thái phòng.' });
}

export async function listUsers(_req, res) {
  const [rows] = await pool.query(
    `SELECT user_id AS id, full_name AS fullName, email, phone, role, status,
      email_verified AS emailVerified, auth_provider AS authProvider, created_at AS createdAt
     FROM users ORDER BY created_at DESC LIMIT 300`,
  );
  res.json({ users: rows });
}

export async function updateUserStatus(req, res) {
  const status = String(req.body.status || '');
  if (!['active', 'locked'].includes(status)) throw new HttpError(400, 'Trạng thái tài khoản không hợp lệ.', 'INVALID_USER_STATUS');
  if (Number(req.params.id) === Number(req.user.user_id)) throw new HttpError(400, 'Không thể tự khóa tài khoản đang đăng nhập.', 'SELF_LOCK');
  const [result] = await pool.execute(
    "UPDATE users SET status=? WHERE user_id=? AND role <> 'admin'",
    [status, Number(req.params.id)],
  );
  if (!result.affectedRows) throw new HttpError(404, 'Không tìm thấy tài khoản hoặc không thể thay đổi quản trị viên.', 'USER_NOT_FOUND');
  res.json({ message: 'Đã cập nhật tài khoản.' });
}

export async function updateUserRole(req, res) {
  const role = String(req.body.role || '');
  if (!['customer', 'staff'].includes(role)) throw new HttpError(400, 'Vai trò chỉ có thể là khách hàng hoặc lễ tân.', 'INVALID_USER_ROLE');
  if (Number(req.params.id) === Number(req.user.user_id)) throw new HttpError(400, 'Không thể tự thay đổi vai trò của mình.', 'SELF_ROLE_CHANGE');
  const [result] = await pool.execute(
    "UPDATE users SET role=? WHERE user_id=? AND role IN ('customer','staff')",
    [role, Number(req.params.id)],
  );
  if (!result.affectedRows) throw new HttpError(404, 'Không tìm thấy tài khoản hoặc không thể thay đổi quản trị viên.', 'USER_NOT_FOUND');
  res.json({ message: role === 'staff' ? 'Đã phân quyền lễ tân.' : 'Đã chuyển tài khoản về vai trò khách hàng.' });
}
