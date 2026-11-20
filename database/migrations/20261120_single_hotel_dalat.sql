-- =====================================================================
-- VNHotel single-hotel mode: chỉ vận hành VNHotel tại Đà Lạt.
-- Migration an toàn cho database hiện hữu: KHÔNG xóa khách sạn, phòng,
-- đơn đặt phòng hoặc thanh toán cũ. Chỉ ẩn các khách sạn ngoài Đà Lạt.
-- Chạy một lần trên TiDB Cloud SQL Editor sau khi sao lưu database.
-- =====================================================================
START TRANSACTION;

UPDATE hotels
SET status = 'inactive'
WHERE city <> 'Đà Lạt';

UPDATE hotels
SET status = 'active'
WHERE city = 'Đà Lạt';

UPDATE room_types rt
JOIN hotels h ON h.hotel_id = rt.hotel_id
SET rt.status = 'inactive'
WHERE h.city <> 'Đà Lạt';

UPDATE rooms r
JOIN hotels h ON h.hotel_id = r.hotel_id
SET r.status = 'inactive'
WHERE h.city <> 'Đà Lạt'
  AND r.status = 'available';

COMMIT;

-- Kiểm tra: chỉ còn một khách sạn đang hoạt động trong phạm vi đồ án.
SELECT hotel_id, name, city, status
FROM hotels
WHERE city = 'Đà Lạt';

SELECT h.name, COUNT(r.room_id) AS total_rooms
FROM hotels h
LEFT JOIN rooms r ON r.hotel_id = h.hotel_id
WHERE h.city = 'Đà Lạt'
GROUP BY h.hotel_id, h.name;
