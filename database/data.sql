-- =====================================================================
-- VNHotel - Dữ liệu mẫu cho đồ án một khách sạn tại Đà Lạt.
-- Chỉ chạy sau schema.sql trên DATABASE MỚI.
-- Với TiDB đang có dữ liệu, KHÔNG chạy lại file này; hãy dùng migration
-- migrations/20261120_single_hotel_dalat.sql để ẩn các khách sạn ngoài Đà Lạt.
-- =====================================================================
SET NAMES utf8mb4;
USE hotel_booking;

-- Tài khoản quản trị được tạo an toàn bằng npm run seed:admin sau khi cấu hình backend/.env.

INSERT INTO hotels (hotel_id, name, address, city, star_rating, description, status) VALUES
 (1, 'VNHotel Đà Lạt', '8 Trần Hưng Đạo, Phường 10, Đà Lạt, Lâm Đồng', 'Đà Lạt', 4,
  'Khách sạn nghỉ dưỡng quy mô nhỏ tại Đà Lạt, phù hợp cho cặp đôi, gia đình và nhóm bạn. Khách hàng có thể kiểm tra phòng trống theo ngày và đặt phòng trực tuyến.', 'active');

INSERT INTO hotel_images (hotel_id, url, sort_order) VALUES
 (1, 'https://images.unsplash.com/photo-1566073771259-6a8506099945?auto=format&fit=crop&w=1400&q=85', 0);

INSERT INTO room_types (room_type_id, hotel_id, name, description, max_guests, area_m2, base_price, bed_type) VALUES
 (1, 1, 'Phòng Standard', 'Phòng tiêu chuẩn gọn gàng, ấm cúng, phù hợp cho chuyến nghỉ dưỡng ngắn ngày tại Đà Lạt.', 2, 25, 750000, '1 giường đôi'),
 (2, 1, 'Phòng Superior', 'Không gian rộng rãi hơn, thiết kế hiện đại và có khu vực thư giãn cạnh cửa sổ.', 2, 30, 950000, '1 giường Queen'),
 (3, 1, 'Phòng Deluxe', 'Hạng phòng tiện nghi với diện tích thoải mái, phù hợp cho cặp đôi hoặc khách lưu trú dài ngày.', 2, 35, 1250000, '1 giường King'),
 (4, 1, 'Phòng Family', 'Phòng gia đình có hai giường, phù hợp cho nhóm nhỏ hoặc gia đình có trẻ em.', 4, 42, 1550000, '2 giường đôi');

INSERT INTO rooms (hotel_id, room_type_id, room_number, floor, status) VALUES
 (1, 1, '101', 1, 'available'), (1, 1, '102', 1, 'available'),
 (1, 2, '201', 2, 'available'), (1, 2, '202', 2, 'available'),
 (1, 3, '301', 3, 'available'), (1, 3, '302', 3, 'available'),
 (1, 4, '401', 4, 'available'), (1, 4, '402', 4, 'available');

INSERT INTO room_type_images (room_type_id, url, sort_order) VALUES
 (1, 'https://images.unsplash.com/photo-1631049307264-da0ec9d70304?auto=format&fit=crop&w=1200&q=85', 0),
 (1, 'https://images.unsplash.com/photo-1611892440504-42a792e24d32?auto=format&fit=crop&w=1200&q=85', 1),
 (2, 'https://images.unsplash.com/photo-1590490360182-c33d57733427?auto=format&fit=crop&w=1200&q=85', 0),
 (2, 'https://images.unsplash.com/photo-1566665797739-1674de7a421a?auto=format&fit=crop&w=1200&q=85', 1),
 (3, 'https://images.unsplash.com/photo-1611892440504-42a792e24d32?auto=format&fit=crop&w=1200&q=85', 0),
 (3, 'https://images.unsplash.com/photo-1591088398332-8a7791972843?auto=format&fit=crop&w=1200&q=85', 1),
 (4, 'https://images.unsplash.com/photo-1566665797739-1674de7a421a?auto=format&fit=crop&w=1200&q=85', 0),
 (4, 'https://images.unsplash.com/photo-1595576508898-0ad5c879a061?auto=format&fit=crop&w=1200&q=85', 1);

INSERT INTO amenities (amenity_id, name) VALUES
 (1, 'Wi-Fi miễn phí'), (2, 'Điều hòa'), (3, 'TV màn hình phẳng'),
 (4, 'Minibar'), (5, 'Bữa sáng'), (6, 'Máy sấy tóc'),
 (7, 'Hai giường lớn'), (8, 'Bàn làm việc'), (9, 'Ấm đun nước');

INSERT INTO room_type_amenities (room_type_id, amenity_id) VALUES
 (1,1),(1,3),(1,6),(1,9),
 (2,1),(2,2),(2,3),(2,6),(2,9),
 (3,1),(3,2),(3,3),(3,4),(3,5),(3,6),
 (4,1),(4,3),(4,5),(4,7),(4,9);

INSERT INTO services (hotel_id, name, price, unit, status) VALUES
 (1, 'Bữa sáng', 100000, 'người', 'active'),
 (1, 'Giặt ủi', 50000, 'kg', 'active'),
 (1, 'Đưa đón bến xe', 150000, 'lượt', 'active');

-- Không tạo đơn đặt phòng mẫu để tránh dữ liệu ngày cũ làm sai kết quả phòng trống.
-- Tạo tài khoản quản trị bằng lệnh: npm run seed:admin (trong thư mục backend).
