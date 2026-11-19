import pool from '../config/db.js';
import { HttpError } from '../utils/httpError.js';

export async function stats(_req, res) {
  const [[counts]] = await pool.query(
    `SELECT
      (SELECT COUNT(*) FROM bookings WHERE status <> 'cancelled') AS totalBookings,
      (SELECT COUNT(*) FROM bookings WHERE status = 'pending') AS pendingBookings,
      (SELECT COUNT(*) FROM rooms WHERE status = 'available') AS availableRooms,
      (SELECT COUNT(*) FROM users WHERE role = 'customer' AND status = 'active') AS totalCustomers,
      (SELECT COALESCE(SUM(amount),0) FROM payments WHERE status = 'paid') AS revenue`
  );
  const [monthly] = await pool.query(
    `SELECT DATE_FORMAT(paid_at, '%Y-%m') AS month, SUM(amount) AS revenue
     FROM payments WHERE status='paid' AND paid_at >= DATE_SUB(CURDATE(), INTERVAL 6 MONTH)
     GROUP BY DATE_FORMAT(paid_at, '%Y-%m') ORDER BY month`
  );
  res.json({ stats: { ...counts, revenue: Number(counts.revenue) }, monthlyRevenue: monthly.map((r) => ({ month: r.month, revenue: Number(r.revenue) })) });
}


export async function listHotels(_req, res) {
  const [rows] = await pool.query(
    `SELECT h.hotel_id AS id, h.name, h.address, h.city, h.star_rating AS stars,
      h.description, h.status, (SELECT COUNT(*) FROM rooms r WHERE r.hotel_id=h.hotel_id) AS totalRooms,
      (SELECT url FROM hotel_images i WHERE i.hotel_id=h.hotel_id ORDER BY i.sort_order LIMIT 1) AS image
     FROM hotels h ORDER BY h.created_at DESC`
  );
  res.json({ hotels: rows });
}

export async function createHotel(req, res) {
  const name = String(req.body.name || '').trim();
  const address = String(req.body.address || '').trim();
  const city = String(req.body.city || '').trim();
  const stars = req.body.stars == null || req.body.stars === '' ? null : Number(req.body.stars);
  if (!name || !address || !city || (stars !== null && (!Number.isInteger(stars) || stars < 1 || stars > 5))) {
    throw new HttpError(400, 'Vui lòng nhập tên, địa chỉ, thành phố và hạng sao hợp lệ.', 'INVALID_HOTEL_INPUT');
  }
  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();
    const [result] = await connection.execute(
      `INSERT INTO hotels (name, address, city, star_rating, description, status) VALUES (?, ?, ?, ?, ?, 'active')`,
      [name.slice(0, 150), address.slice(0, 255), city.slice(0, 100), stars, String(req.body.description || '').slice(0, 3000) || null],
    );
    if (req.body.image) await connection.execute('INSERT INTO hotel_images (hotel_id, url, sort_order) VALUES (?, ?, 0)', [result.insertId, String(req.body.image).slice(0, 500)]);
    await connection.commit();
    res.status(201).json({ message: 'Đã tạo khách sạn.', hotelId: result.insertId });
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally { connection.release(); }
}

export async function updateHotel(req, res) {
  const status = String(req.body.status || '');
  if (!['active', 'inactive'].includes(status)) throw new HttpError(400, 'Trạng thái khách sạn không hợp lệ.', 'INVALID_HOTEL_STATUS');
  const [result] = await pool.execute('UPDATE hotels SET status=? WHERE hotel_id=?', [status, Number(req.params.id)]);
  if (!result.affectedRows) throw new HttpError(404, 'Không tìm thấy khách sạn.', 'HOTEL_NOT_FOUND');
  res.json({ message: 'Đã cập nhật trạng thái khách sạn.' });
}

export async function listBookings(_req, res) {
  const [rows] = await pool.query(
    `SELECT b.booking_id AS id, b.booking_code AS code, b.guest_name AS guestName, b.guest_email AS guestEmail,
      b.guest_phone AS guestPhone, b.num_guests AS guests, b.total_amount AS totalAmount, b.status,
      b.created_at AS createdAt, h.name AS hotelName, rt.name AS roomName, d.check_in AS checkIn, d.check_out AS checkOut,
      p.status AS paymentStatus, p.provider AS paymentProvider, p.payment_id AS paymentId
     FROM bookings b JOIN booking_details d ON d.booking_id=b.booking_id JOIN rooms r ON r.room_id=d.room_id
     JOIN room_types rt ON rt.room_type_id=r.room_type_id JOIN hotels h ON h.hotel_id=b.hotel_id
     LEFT JOIN payments p ON p.payment_id=(SELECT MAX(p2.payment_id) FROM payments p2 WHERE p2.booking_id=b.booking_id)
     ORDER BY b.created_at DESC LIMIT 300`
  );
  res.json({ bookings: rows });
}

export async function updateBookingStatus(req, res) {
  const allowed = ['pending', 'confirmed', 'checked_in', 'checked_out', 'cancelled'];
  const status = String(req.body.status || '');
  if (!allowed.includes(status)) throw new HttpError(400, 'Trạng thái đơn không hợp lệ.', 'INVALID_STATUS');
  const [result] = await pool.execute(`UPDATE bookings SET status=?, cancelled_at=IF(?='cancelled',UTC_TIMESTAMP(),NULL) WHERE booking_id=?`, [status, status, Number(req.params.id)]);
  if (!result.affectedRows) throw new HttpError(404, 'Không tìm thấy đơn đặt phòng.', 'BOOKING_NOT_FOUND');
  if (status === 'cancelled') await pool.execute("UPDATE payments SET status='failed' WHERE booking_id=? AND status='pending'", [Number(req.params.id)]);
  res.json({ message: 'Đã cập nhật trạng thái đơn.' });
}

export async function listRooms(_req, res) {
  const [rows] = await pool.query(
    `SELECT r.room_id AS id, r.room_number AS roomNumber, r.floor, r.status AS roomStatus,
      rt.room_type_id AS roomTypeId, rt.name AS name, rt.base_price AS price, rt.max_guests AS maxGuests,
      h.hotel_id AS hotelId, h.name AS hotelName, h.city
     FROM rooms r JOIN room_types rt ON rt.room_type_id=r.room_type_id JOIN hotels h ON h.hotel_id=r.hotel_id
     ORDER BY h.hotel_id, r.room_number`
  );
  res.json({ rooms: rows });
}

export async function createRoomType(req, res) {
  const hotelId = Number(req.body.hotelId);
  const name = String(req.body.name || '').trim();
  const price = Number(req.body.price);
  const maxGuests = Number(req.body.maxGuests || 2);
  const area = req.body.area ? Number(req.body.area) : null;
  const roomNumber = String(req.body.roomNumber || '').trim();
  if (!hotelId || !name || !Number.isFinite(price) || price < 0 || !Number.isInteger(maxGuests) || maxGuests < 1 || !roomNumber) {
    throw new HttpError(400, 'Vui lòng nhập khách sạn, tên loại phòng, giá, sức chứa và số phòng đầu tiên.', 'INVALID_ROOM_INPUT');
  }
  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();
    const [typeResult] = await connection.execute(
      `INSERT INTO room_types (hotel_id, name, description, max_guests, area_m2, base_price, bed_type, status)
       VALUES (?, ?, ?, ?, ?, ?, ?, 'active')`,
      [hotelId, name, String(req.body.description || '').slice(0, 2000) || null, maxGuests, area, price, String(req.body.bedType || '').slice(0, 50) || null],
    );
    const [roomResult] = await connection.execute(
      'INSERT INTO rooms (hotel_id, room_type_id, room_number, floor, status) VALUES (?, ?, ?, ?, \'available\')',
      [hotelId, typeResult.insertId, roomNumber, req.body.floor ? Number(req.body.floor) : null],
    );
    if (req.body.image) await connection.execute('INSERT INTO room_type_images (room_type_id, url, sort_order) VALUES (?, ?, 0)', [typeResult.insertId, String(req.body.image).slice(0, 500)]);
    await connection.commit();
    res.status(201).json({ message: 'Đã tạo loại phòng và phòng vật lý đầu tiên.', roomTypeId: typeResult.insertId, roomId: roomResult.insertId });
  } catch (error) {
    await connection.rollback();
    if (error.code === 'ER_DUP_ENTRY') throw new HttpError(409, 'Tên loại phòng hoặc số phòng đã tồn tại tại khách sạn này.', 'ROOM_DUPLICATE');
    throw error;
  } finally { connection.release(); }
}

export async function updateRoom(req, res) {
  const roomId = Number(req.params.id);
  const status = String(req.body.status || '');
  const allowed = ['available', 'cleaning', 'maintenance', 'inactive'];
  if (!allowed.includes(status)) throw new HttpError(400, 'Trạng thái phòng không hợp lệ.', 'INVALID_ROOM_STATUS');
  const [result] = await pool.execute('UPDATE rooms SET status=? WHERE room_id=?', [status, roomId]);
  if (!result.affectedRows) throw new HttpError(404, 'Không tìm thấy phòng.', 'ROOM_NOT_FOUND');
  res.json({ message: 'Đã cập nhật trạng thái phòng.' });
}

export async function listUsers(_req, res) {
  const [rows] = await pool.query(
    `SELECT user_id AS id, full_name AS fullName, email, phone, role, status, email_verified AS emailVerified, auth_provider AS authProvider, created_at AS createdAt
     FROM users ORDER BY created_at DESC LIMIT 300`
  );
  res.json({ users: rows });
}

export async function updateUserStatus(req, res) {
  const status = String(req.body.status || '');
  if (!['active', 'locked'].includes(status)) throw new HttpError(400, 'Trạng thái tài khoản không hợp lệ.', 'INVALID_USER_STATUS');
  if (Number(req.params.id) === Number(req.user.user_id)) throw new HttpError(400, 'Không thể tự khóa tài khoản đang đăng nhập.', 'SELF_LOCK');
  const [result] = await pool.execute('UPDATE users SET status=? WHERE user_id=? AND role <> \'admin\'', [status, Number(req.params.id)]);
  if (!result.affectedRows) throw new HttpError(404, 'Không tìm thấy tài khoản hoặc không thể thay đổi quản trị viên.', 'USER_NOT_FOUND');
  res.json({ message: 'Đã cập nhật tài khoản.' });
}
