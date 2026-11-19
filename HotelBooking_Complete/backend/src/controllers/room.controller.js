import pool from '../config/db.js';
import { HttpError } from '../utils/httpError.js';

export async function listRooms(req, res) {
  const destination = String(req.query.destination || '').trim();
  const guests = Math.max(1, Number(req.query.guests || 1));
  const checkIn = String(req.query.checkIn || '');
  const checkOut = String(req.query.checkOut || '');
  const whereParams = [guests];
  let where = `rt.status = 'active' AND h.status = 'active' AND rt.max_guests >= ?`;
  if (destination) { where += ' AND (h.city LIKE ? OR h.name LIKE ? OR h.address LIKE ?)'; whereParams.push(`%${destination}%`, `%${destination}%`, `%${destination}%`); }
  let availabilitySql = '0';
  if (/^\d{4}-\d{2}-\d{2}$/.test(checkIn) && /^\d{4}-\d{2}-\d{2}$/.test(checkOut) && checkOut > checkIn) {
    availabilitySql = `(SELECT COUNT(*) FROM rooms r WHERE r.room_type_id = rt.room_type_id AND r.status = 'available'
      AND NOT EXISTS (SELECT 1 FROM booking_details d JOIN bookings b ON b.booking_id=d.booking_id
        WHERE d.room_id=r.room_id AND b.status <> 'cancelled' AND d.check_in < ? AND d.check_out > ?))`;
  } else {
    availabilitySql = `(SELECT COUNT(*) FROM rooms r WHERE r.room_type_id = rt.room_type_id AND r.status = 'available')`;
  }
  const params = [...(/^\d{4}-\d{2}-\d{2}$/.test(checkIn) && /^\d{4}-\d{2}-\d{2}$/.test(checkOut) && checkOut > checkIn ? [checkOut, checkIn] : []), ...whereParams];
  const [rows] = await pool.execute(
    `SELECT rt.room_type_id AS id, rt.name, rt.description, rt.max_guests AS capacity,
      rt.area_m2 AS area, rt.base_price AS price, rt.bed_type AS bedType,
      h.hotel_id AS hotelId, h.name AS hotelName, h.city AS location, h.address,
      h.star_rating AS stars, (SELECT url FROM room_type_images i WHERE i.room_type_id=rt.room_type_id ORDER BY i.sort_order LIMIT 1) AS image,
      ${availabilitySql} AS availableRooms,
      (SELECT GROUP_CONCAT(a.name ORDER BY a.name SEPARATOR '|') FROM room_type_amenities ra JOIN amenities a ON a.amenity_id=ra.amenity_id WHERE ra.room_type_id=rt.room_type_id) AS amenities
     FROM room_types rt JOIN hotels h ON h.hotel_id=rt.hotel_id WHERE ${where}
     ORDER BY h.star_rating DESC, rt.base_price ASC`, params,
  );
  res.json({ rooms: rows.map(mapRoom) });
}

export async function getRoom(req, res) {
  const [rows] = await pool.execute(
    `SELECT rt.room_type_id AS id, rt.name, rt.description, rt.max_guests AS capacity,
      rt.area_m2 AS area, rt.base_price AS price, rt.bed_type AS bedType,
      h.hotel_id AS hotelId, h.name AS hotelName, h.city AS location, h.address, h.star_rating AS stars,
      (SELECT url FROM room_type_images i WHERE i.room_type_id=rt.room_type_id ORDER BY i.sort_order LIMIT 1) AS image,
      (SELECT COUNT(*) FROM rooms r WHERE r.room_type_id=rt.room_type_id AND r.status='available') AS availableRooms,
      (SELECT GROUP_CONCAT(a.name ORDER BY a.name SEPARATOR '|') FROM room_type_amenities ra JOIN amenities a ON a.amenity_id=ra.amenity_id WHERE ra.room_type_id=rt.room_type_id) AS amenities
     FROM room_types rt JOIN hotels h ON h.hotel_id=rt.hotel_id
     WHERE rt.room_type_id = ? AND rt.status='active' AND h.status='active' LIMIT 1`, [Number(req.params.id)],
  );
  if (!rows.length) throw new HttpError(404, 'Không tìm thấy loại phòng.', 'ROOM_NOT_FOUND');
  const [images] = await pool.execute('SELECT url FROM room_type_images WHERE room_type_id = ? ORDER BY sort_order', [Number(req.params.id)]);
  res.json({ room: { ...mapRoom(rows[0]), images: images.map((x) => x.url) } });
}

function mapRoom(row) {
  return { ...row, price: Number(row.price), area: row.area == null ? null : Number(row.area), capacity: Number(row.capacity), stars: Number(row.stars || 0), availableRooms: Number(row.availableRooms), amenities: row.amenities ? row.amenities.split('|') : [] };
}
