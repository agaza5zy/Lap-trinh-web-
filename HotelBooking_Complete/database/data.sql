-- =====================================================================
--  HOTEL BOOKING - Dữ liệu mẫu (khớp rooms.js và Admin.jsx của frontend)
--  Chạy SAU schema.sql:  mysql -u root -p < schema.sql  &&  mysql -u root -p < data.sql
--  Sau khi import, chạy `npm run seed:admin` trong backend để tạo hash bcrypt cho admin demo.
-- =====================================================================
SET NAMES utf8mb4;
USE hotel_booking;

INSERT INTO users (user_id, full_name, email, phone, password_hash, role) VALUES
 (1, 'Quan tri vien', 'admin@vnhotel.vn', '0900000000', 'TEMPORARY_HASH_REPLACE_WITH_NPM_RUN_SEED_ADMIN', 'admin');

INSERT INTO hotels (hotel_id, name, address, city, star_rating, description) VALUES
 (1, 'VNHotel Đà Nẵng',     '1 Võ Nguyên Giáp',   'Đà Nẵng',     5, 'Khách sạn ven biển Mỹ Khê.'),
 (2, 'VNHotel Sài Gòn',     '10 Nguyễn Huệ',      'Hồ Chí Minh', 5, 'Trung tâm Quận 1.'),
 (3, 'VNHotel Hà Nội',      '5 Tràng Tiền',       'Hà Nội',      4, 'Gần Hồ Hoàn Kiếm.'),
 (4, 'VNHotel Đà Lạt',      '8 Trần Hưng Đạo',    'Đà Lạt',      4, 'Không gian se lạnh, nhiều thông.'),
 (5, 'VNHotel Nha Trang',   '20 Trần Phú',        'Nha Trang',   5, 'Mặt tiền biển.'),
 (6, 'VNHotel Huế',         '3 Lê Lợi',           'Huế',         3, 'Bên bờ sông Hương.');

INSERT INTO room_types (room_type_id, hotel_id, name, description, max_guests, area_m2, base_price, bed_type) VALUES
 (1, 1, 'Deluxe Hướng Biển',    'Không gian hiện đại, cửa sổ rộng và tiện nghi cao cấp.',          2, 38, 1250000, 'Giường đôi'),
 (2, 2, 'Suite Sang Trọng',     'Suite rộng rãi phù hợp cho kỳ nghỉ thư giãn và riêng tư.',        3, 52, 2100000, 'Giường King'),
 (3, 3, 'Superior Thành Phố',   'Lựa chọn tiện nghi, hợp lý cho những chuyến đi công tác.',        2, 28,  890000, 'Giường đôi'),
 (4, 4, 'Gia Đình',             'Không gian thoải mái cho gia đình và nhóm bạn.',                  4, 46, 1650000, '2 giường lớn'),
 (5, 5, 'Premier Có Ban Công',  'Ban công thoáng đãng với phong cách nghỉ dưỡng tinh tế.',         2, 36, 1490000, 'Giường đôi'),
 (6, 6, 'Standard Tiện Nghi',   'Phòng tiêu chuẩn sạch đẹp, tiện lợi và tiết kiệm.',               2, 24,  690000, 'Giường đôi');

INSERT INTO rooms (hotel_id, room_type_id, room_number, floor) VALUES
 (1,1,'501',5),(1,1,'502',5),(2,2,'1201',12),(2,2,'1202',12),(3,3,'301',3),(3,3,'302',3),
 (4,4,'201',2),(4,4,'202',2),(5,5,'601',6),(5,5,'602',6),(6,6,'101',1),(6,6,'102',1);

INSERT INTO room_type_images (room_type_id, url, sort_order) VALUES
 (1,'https://images.unsplash.com/photo-1611892440504-42a792e24d32?auto=format&fit=crop&w=1000&q=85',0),
 (2,'https://images.unsplash.com/photo-1590490360182-c33d57733427?auto=format&fit=crop&w=1000&q=85',0),
 (3,'https://images.unsplash.com/photo-1631049307264-da0ec9d70304?auto=format&fit=crop&w=1000&q=85',0),
 (4,'https://images.unsplash.com/photo-1566665797739-1674de7a421a?auto=format&fit=crop&w=1000&q=85',0),
 (5,'https://images.unsplash.com/photo-1591088398332-8a7791972843?auto=format&fit=crop&w=1000&q=85',0),
 (6,'https://images.unsplash.com/photo-1595576508898-0ad5c879a061?auto=format&fit=crop&w=1000&q=85',0);

INSERT INTO amenities (amenity_id, name) VALUES
 (1,'Wi-Fi miễn phí'),(2,'Điều hòa'),(3,'Bữa sáng'),(4,'TV màn hình phẳng'),(5,'Bồn tắm'),
 (6,'Minibar'),(7,'Bàn làm việc'),(8,'Hai giường lớn'),(9,'Ban công');

INSERT INTO room_type_amenities (room_type_id, amenity_id) VALUES
 (1,1),(1,2),(1,3),(1,4),
 (2,1),(2,5),(2,3),(2,6),
 (3,1),(3,2),(3,7),
 (4,1),(4,8),(4,9),
 (5,1),(5,9),(5,3),
 (6,1),(6,2),(6,4);

INSERT INTO services (hotel_id, name, price, unit) VALUES
 (1,'Bữa sáng',150000,'người'),(1,'Đưa đón sân bay',300000,'lượt'),(2,'Bữa sáng',150000,'người');

INSERT INTO bookings (booking_id, booking_code, hotel_id, user_id, guest_name, guest_email, guest_phone,
                      num_guests, subtotal_rooms, total_amount, status) VALUES
 (1,'BK001',1,NULL,'Nguyễn Văn An', 'an@example.com',   '0911111111',2,2500000,2500000,'pending'),
 (2,'BK002',2,NULL,'Trần Minh Anh', 'anh@example.com',  '0922222222',2,4200000,4200000,'confirmed'),
 (3,'BK003',4,NULL,'Lê Thanh Bình', 'binh@example.com', '0933333333',4,3300000,3300000,'confirmed');

INSERT INTO booking_details (booking_id, hotel_id, room_id, check_in, check_out, price_per_night) VALUES
 (1,1,1,'2026-11-03','2026-11-05',1250000),
 (2,2,3,'2026-11-07','2026-11-09',2100000),
 (3,4,7,'2026-11-12','2026-11-14',1650000);

