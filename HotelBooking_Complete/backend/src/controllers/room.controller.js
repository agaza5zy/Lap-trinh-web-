import pool from '../config/db.js';
import { HttpError } from '../utils/httpError.js';

const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

function isRealDate(value) {
  if (!DATE_PATTERN.test(value)) return false;
  const parsed = new Date(`${value}T00:00:00.000Z`);
  return Number.isFinite(parsed.getTime()) && parsed.toISOString().slice(0, 10) === value;
}

function getDateRange(query) {
  const todayInVietnam = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Ho_Chi_Minh', year: 'numeric', month: '2-digit', day: '2-digit',
  }).format(new Date());
  const checkIn = String(query.checkIn || '').trim();
  const checkOut = String(query.checkOut || '').trim();
  if (!checkIn && !checkOut) return null;
  if (!isRealDate(checkIn) || !isRealDate(checkOut) || checkOut <= checkIn) {
    throw new HttpError(400, 'Vui lòng chọn ngày nhận phòng và trả phòng hợp lệ; ngày trả phòng phải sau ngày nhận phòng.', 'INVALID_DATES');
  }
  if (checkIn < todayInVietnam) {
    throw new HttpError(400, 'Ngày nhận phòng không thể nằm trong quá khứ.', 'PAST_CHECK_IN');
  }
  return { checkIn, checkOut };
}

function availabilityExpression(dateRange) {
  if (!dateRange) {
    return `(SELECT COUNT(*) FROM rooms r
      WHERE r.room_type_id = rt.room_type_id AND r.status = 'available')`;
  }
  return `(SELECT COUNT(*) FROM rooms r
    WHERE r.room_type_id = rt.room_type_id AND r.status = 'available'
      AND NOT EXISTS (
        SELECT 1 FROM booking_details d
        JOIN bookings b ON b.booking_id = d.booking_id
        WHERE d.room_id = r.room_id
          AND b.status <> 'cancelled'
          AND d.check_in < ? AND d.check_out > ?
      ))`;
}

function mapRoom(row, availabilityChecked = false) {
  return {
    ...row,
    price: Number(row.price),
    area: row.area == null ? null : Number(row.area),
    capacity: Number(row.capacity),
    stars: Number(row.stars || 0),
    availableRooms: Number(row.availableRooms || 0),
    totalRooms: Number(row.totalRooms || 0),
    availabilityChecked,
    amenities: row.amenities ? row.amenities.split('|') : [],
  };
}

export async function listRooms(req, res) {
  const destination = String(req.query.destination || '').trim();
  const guests = Number(req.query.guests || 1);
  const dateRange = getDateRange(req.query);
  if (!Number.isInteger(guests) || guests < 1 || guests > 12) {
    throw new HttpError(400, 'Số lượng khách phải từ 1 đến 12.', 'INVALID_GUESTS');
  }

  const whereParams = [guests];
  let where = `rt.status = 'active' AND h.status = 'active' AND rt.max_guests >= ?`;
  if (destination) {
    where += ' AND (h.city LIKE ? OR h.name LIKE ? OR h.address LIKE ?)';
    whereParams.push(`%${destination}%`, `%${destination}%`, `%${destination}%`);
  }

  const availabilitySql = availabilityExpression(dateRange);
  const availabilityParams = dateRange ? [dateRange.checkOut, dateRange.checkIn] : [];
  const [rows] = await pool.execute(
    `SELECT rt.room_type_id AS id, rt.name, rt.description, rt.max_guests AS capacity,
      rt.area_m2 AS area, rt.base_price AS price, rt.bed_type AS bedType,
      h.hotel_id AS hotelId, h.name AS hotelName, h.city AS location, h.address,
      h.star_rating AS stars,
      (SELECT url FROM room_type_images i WHERE i.room_type_id=rt.room_type_id ORDER BY i.sort_order LIMIT 1) AS image,
      (SELECT COUNT(*) FROM rooms total_room
        WHERE total_room.room_type_id=rt.room_type_id AND total_room.status='available') AS totalRooms,
      ${availabilitySql} AS availableRooms,
      (SELECT GROUP_CONCAT(a.name ORDER BY a.name SEPARATOR '|')
        FROM room_type_amenities ra JOIN amenities a ON a.amenity_id=ra.amenity_id
        WHERE ra.room_type_id=rt.room_type_id) AS amenities
     FROM room_types rt JOIN hotels h ON h.hotel_id=rt.hotel_id
     WHERE ${where}
     ORDER BY h.star_rating DESC, rt.base_price ASC`,
    [...availabilityParams, ...whereParams],
  );

  res.json({
    rooms: rows.map((row) => mapRoom(row, Boolean(dateRange))),
    availabilityChecked: Boolean(dateRange),
    checkIn: dateRange?.checkIn || null,
    checkOut: dateRange?.checkOut || null,
  });
}

export async function getRoom(req, res) {
  const roomTypeId = Number(req.params.id);
  if (!Number.isInteger(roomTypeId) || roomTypeId < 1) {
    throw new HttpError(404, 'Không tìm thấy loại phòng.', 'ROOM_NOT_FOUND');
  }
  const dateRange = getDateRange(req.query);
  const availabilitySql = availabilityExpression(dateRange);
  const availabilityParams = dateRange ? [dateRange.checkOut, dateRange.checkIn] : [];

  const [rows] = await pool.execute(
    `SELECT rt.room_type_id AS id, rt.name, rt.description, rt.max_guests AS capacity,
      rt.area_m2 AS area, rt.base_price AS price, rt.bed_type AS bedType,
      h.hotel_id AS hotelId, h.name AS hotelName, h.city AS location, h.address,
      h.star_rating AS stars,
      (SELECT url FROM room_type_images i WHERE i.room_type_id=rt.room_type_id ORDER BY i.sort_order LIMIT 1) AS image,
      (SELECT COUNT(*) FROM rooms total_room
        WHERE total_room.room_type_id=rt.room_type_id AND total_room.status='available') AS totalRooms,
      ${availabilitySql} AS availableRooms,
      (SELECT GROUP_CONCAT(a.name ORDER BY a.name SEPARATOR '|')
        FROM room_type_amenities ra JOIN amenities a ON a.amenity_id=ra.amenity_id
        WHERE ra.room_type_id=rt.room_type_id) AS amenities
     FROM room_types rt JOIN hotels h ON h.hotel_id=rt.hotel_id
     WHERE rt.room_type_id = ? AND rt.status='active' AND h.status='active' LIMIT 1`,
    [...availabilityParams, roomTypeId],
  );
  if (!rows.length) throw new HttpError(404, 'Không tìm thấy loại phòng.', 'ROOM_NOT_FOUND');

  const [images] = await pool.execute(
    'SELECT url FROM room_type_images WHERE room_type_id = ? ORDER BY sort_order',
    [roomTypeId],
  );
  res.json({
    room: {
      ...mapRoom(rows[0], Boolean(dateRange)),
      images: images.map((image) => image.url),
    },
    availabilityChecked: Boolean(dateRange),
    checkIn: dateRange?.checkIn || null,
    checkOut: dateRange?.checkOut || null,
  });
}
