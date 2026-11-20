import pool from '../config/db.js';
import { SINGLE_HOTEL_CITY, validDateRange } from '../config/hotel.js';
import { HttpError } from '../utils/httpError.js';

export async function listRooms(req, res) {
  const destination = String(req.query.destination || '').trim();
  const guests = Number(req.query.guests || 1);
  if (!Number.isInteger(guests) || guests < 1 || guests > 12) {
    throw new HttpError(400, 'Số khách phải là số nguyên từ 1 đến 12.', 'INVALID_GUESTS');
  }
  const checkIn = String(req.query.checkIn || '');
  const checkOut = String(req.query.checkOut || '');
  const hasDate = Boolean(checkIn || checkOut);
  if (hasDate && !validDateRange(checkIn, checkOut)) {
    throw new HttpError(400, 'Vui lòng chọn ngày nhận phòng và ngày trả phòng hợp lệ.', 'INVALID_DATES');
  }

  const where = ["rt.status = 'active'", "h.status = 'active'", 'h.city = ?', 'rt.max_guests >= ?'];
  const whereParams = [SINGLE_HOTEL_CITY, guests];
  if (destination && !SINGLE_HOTEL_CITY.toLocaleLowerCase('vi').includes(destination.toLocaleLowerCase('vi'))
    && !destination.toLocaleLowerCase('vi').includes(SINGLE_HOTEL_CITY.toLocaleLowerCase('vi'))) {
    where.push('(h.city LIKE ? OR h.name LIKE ? OR h.address LIKE ?)');
    whereParams.push(`%${destination}%`, `%${destination}%`, `%${destination}%`);
  }

  const availabilitySql = hasDate
    ? `(SELECT COUNT(*) FROM rooms r WHERE r.room_type_id = rt.room_type_id AND r.hotel_id = rt.hotel_id AND r.status = 'available'
        AND NOT EXISTS (SELECT 1 FROM booking_details d JOIN bookings b ON b.booking_id=d.booking_id
          WHERE d.room_id=r.room_id AND b.status <> 'cancelled' AND d.check_in < ? AND d.check_out > ?))`
    : `(SELECT COUNT(*) FROM rooms r WHERE r.room_type_id = rt.room_type_id AND r.hotel_id = rt.hotel_id AND r.status = 'available')`;

  const params = [...(hasDate ? [checkOut, checkIn] : []), ...whereParams];
  const [rows] = await pool.execute(
    `SELECT rt.room_type_id AS id, rt.name, rt.description, rt.max_guests AS capacity,
      rt.area_m2 AS area, rt.base_price AS price, rt.bed_type AS bedType,
      h.hotel_id AS hotelId, h.name AS hotelName, h.city AS location, h.address,
      h.star_rating AS stars,
      (SELECT url FROM room_type_images i WHERE i.room_type_id=rt.room_type_id ORDER BY i.sort_order LIMIT 1) AS image,
      ${availabilitySql} AS availableRooms,
      (SELECT GROUP_CONCAT(a.name ORDER BY a.name SEPARATOR '|') FROM room_type_amenities ra JOIN amenities a ON a.amenity_id=ra.amenity_id WHERE ra.room_type_id=rt.room_type_id) AS amenities
     FROM room_types rt JOIN hotels h ON h.hotel_id=rt.hotel_id
     WHERE ${where.join(' AND ')}
     ORDER BY rt.base_price ASC, rt.name ASC`, params,
  );
  res.json({ rooms: rows.map((row) => mapRoom(row, { checkIn, checkOut })) });
}

export async function getRoom(req, res) {
  const roomTypeId = Number(req.params.id);
  const checkIn = String(req.query.checkIn || '');
  const checkOut = String(req.query.checkOut || '');
  const hasDate = Boolean(checkIn || checkOut);
  if (hasDate && !validDateRange(checkIn, checkOut)) {
    throw new HttpError(400, 'Vui lòng chọn ngày nhận phòng và ngày trả phòng hợp lệ.', 'INVALID_DATES');
  }

  const availabilitySql = hasDate
    ? `(SELECT COUNT(*) FROM rooms r WHERE r.room_type_id=rt.room_type_id AND r.hotel_id=rt.hotel_id AND r.status='available'
        AND NOT EXISTS (SELECT 1 FROM booking_details d JOIN bookings b ON b.booking_id=d.booking_id
          WHERE d.room_id=r.room_id AND b.status <> 'cancelled' AND d.check_in < ? AND d.check_out > ?))`
    : `(SELECT COUNT(*) FROM rooms r WHERE r.room_type_id=rt.room_type_id AND r.hotel_id=rt.hotel_id AND r.status='available')`;
  const params = [...(hasDate ? [checkOut, checkIn] : []), roomTypeId, SINGLE_HOTEL_CITY];
  const [rows] = await pool.execute(
    `SELECT rt.room_type_id AS id, rt.name, rt.description, rt.max_guests AS capacity,
      rt.area_m2 AS area, rt.base_price AS price, rt.bed_type AS bedType,
      h.hotel_id AS hotelId, h.name AS hotelName, h.city AS location, h.address, h.star_rating AS stars,
      (SELECT url FROM room_type_images i WHERE i.room_type_id=rt.room_type_id ORDER BY i.sort_order LIMIT 1) AS image,
      ${availabilitySql} AS availableRooms,
      (SELECT GROUP_CONCAT(a.name ORDER BY a.name SEPARATOR '|') FROM room_type_amenities ra JOIN amenities a ON a.amenity_id=ra.amenity_id WHERE ra.room_type_id=rt.room_type_id) AS amenities
     FROM room_types rt JOIN hotels h ON h.hotel_id=rt.hotel_id
     WHERE rt.room_type_id=? AND rt.status='active' AND h.status='active' AND h.city=? LIMIT 1`, params,
  );
  if (!rows.length) throw new HttpError(404, 'Không tìm thấy loại phòng tại VNHotel Đà Lạt.', 'ROOM_NOT_FOUND');
  const [images] = await pool.execute('SELECT url FROM room_type_images WHERE room_type_id = ? ORDER BY sort_order', [roomTypeId]);
  res.json({ room: { ...mapRoom(rows[0], { checkIn, checkOut }), images: images.map((item) => item.url) } });
}

function mapRoom(row, dateRange = {}) {
  return {
    ...row,
    price: Number(row.price),
    area: row.area == null ? null : Number(row.area),
    capacity: Number(row.capacity),
    stars: Number(row.stars || 0),
    availableRooms: Number(row.availableRooms),
    checkIn: dateRange.checkIn || null,
    checkOut: dateRange.checkOut || null,
    amenities: row.amenities ? row.amenities.split('|') : [],
  };
}
