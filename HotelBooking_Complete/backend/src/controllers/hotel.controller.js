import pool from '../config/db.js';

export async function listHotels(_req, res) {
  const [rows] = await pool.query(
    `SELECT h.hotel_id AS id, h.name, h.address, h.city, h.star_rating AS stars, h.description,
      (SELECT url FROM hotel_images i WHERE i.hotel_id=h.hotel_id ORDER BY i.sort_order LIMIT 1) AS image,
      (SELECT COUNT(*) FROM rooms r WHERE r.hotel_id=h.hotel_id AND r.status='available') AS availableRooms
     FROM hotels h WHERE h.status='active' ORDER BY h.star_rating DESC, h.name`
  );
  res.json({ hotels: rows });
}
