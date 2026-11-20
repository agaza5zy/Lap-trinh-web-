-- =====================================================================
--  HOTEL BOOKING - Schema đã tối ưu (chỉ cấu trúc; dữ liệu mẫu ở data.sql) (MySQL 8.0+ / MariaDB 10.5+)
--  Dựa trên: Thiet_ke_CSDL_dat_phong_khach_san.docx + ERD drawio
--  Đối chiếu với frontend: HotelBooking/frontend (rooms.js, Booking.jsx, Admin.jsx)
-- =====================================================================
SET NAMES utf8mb4;
CREATE DATABASE IF NOT EXISTS hotel_booking
  CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE hotel_booking;

SET FOREIGN_KEY_CHECKS = 0;
DROP VIEW  IF EXISTS v_hotel_rating;
DROP TABLE IF EXISTS oauth_login_challenges, reviews, payments, booking_services, booking_details, bookings,
                     promotions, room_type_amenities, amenities, room_type_images,
                     rooms, room_types, services, hotel_images, hotels, users;
SET FOREIGN_KEY_CHECKS = 1;

-- ---------------------------------------------------------------------
-- 1. NGƯỜI DÙNG
-- ---------------------------------------------------------------------
CREATE TABLE users (
  user_id        INT UNSIGNED NOT NULL AUTO_INCREMENT,
  full_name      VARCHAR(100) NOT NULL,
  email          VARCHAR(150) NOT NULL,
  phone          VARCHAR(20)  NULL,
  password_hash  VARCHAR(255) NOT NULL,
  role           ENUM('customer','staff','admin') NOT NULL DEFAULT 'customer',
  status         ENUM('active','locked')          NOT NULL DEFAULT 'active',  -- khóa thay vì xóa
  email_verified TINYINT(1) NOT NULL DEFAULT 0,
  email_verification_token_hash CHAR(64) NULL,
  email_verification_expires DATETIME NULL,
  auth_provider  ENUM('local','google','apple') NOT NULL DEFAULT 'local',
  provider_subject VARCHAR(255) NULL,
  created_at     DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at     DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (user_id),
  UNIQUE KEY uq_users_email (email),
  UNIQUE KEY uq_users_provider_subject (auth_provider, provider_subject),
  KEY ix_users_verification (email_verification_token_hash, email_verification_expires)
) ENGINE=InnoDB;

CREATE TABLE oauth_login_challenges (
  challenge_id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  provider ENUM('google','apple') NOT NULL,
  nonce_hash CHAR(64) NOT NULL,
  csrf_hash CHAR(64) NOT NULL,
  expires_at DATETIME NOT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (challenge_id),
  UNIQUE KEY uq_oauth_challenge (provider, nonce_hash),
  KEY ix_oauth_challenge_expiry (expires_at)
) ENGINE=InnoDB;

-- ---------------------------------------------------------------------
-- 2. KHÁCH SẠN, LOẠI PHÒNG, PHÒNG
-- ---------------------------------------------------------------------
CREATE TABLE hotels (
  hotel_id     INT UNSIGNED NOT NULL AUTO_INCREMENT,
  name         VARCHAR(150) NOT NULL,
  address      VARCHAR(255) NOT NULL,
  city         VARCHAR(100) NOT NULL,
  star_rating  TINYINT UNSIGNED NULL,
  description  TEXT NULL,
  status       ENUM('active','inactive') NOT NULL DEFAULT 'active',
  created_at   DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at   DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (hotel_id),
  KEY ix_hotels_city_status (city, status),            -- lọc theo "location" ở trang Rooms
  CONSTRAINT ck_hotels_star CHECK (star_rating IS NULL OR star_rating BETWEEN 1 AND 5)
) ENGINE=InnoDB;

CREATE TABLE hotel_images (
  image_id    INT UNSIGNED NOT NULL AUTO_INCREMENT,
  hotel_id    INT UNSIGNED NOT NULL,
  url         VARCHAR(500) NOT NULL,
  sort_order  SMALLINT UNSIGNED NOT NULL DEFAULT 0,
  PRIMARY KEY (image_id),
  KEY ix_hotel_images_hotel (hotel_id, sort_order),
  CONSTRAINT fk_hotel_images_hotel FOREIGN KEY (hotel_id) REFERENCES hotels(hotel_id) ON DELETE CASCADE
) ENGINE=InnoDB;

CREATE TABLE room_types (
  room_type_id  INT UNSIGNED NOT NULL AUTO_INCREMENT,
  hotel_id      INT UNSIGNED NOT NULL,
  name          VARCHAR(100) NOT NULL,
  description   TEXT NULL,
  max_guests    TINYINT UNSIGNED NOT NULL,
  area_m2       DECIMAL(5,1) NULL,                      -- frontend có "area"
  base_price    DECIMAL(12,0) NOT NULL,                 -- VND không có số lẻ
  bed_type      VARCHAR(50) NULL,
  status        ENUM('active','inactive') NOT NULL DEFAULT 'active',
  created_at    DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at    DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (room_type_id),
  UNIQUE KEY uq_room_types_id_hotel (room_type_id, hotel_id),  -- để bảng con khóa ngoại kép
  UNIQUE KEY uq_room_types_hotel_name (hotel_id, name),
  KEY ix_room_types_search (hotel_id, status, base_price),
  CONSTRAINT fk_room_types_hotel FOREIGN KEY (hotel_id) REFERENCES hotels(hotel_id) ON DELETE RESTRICT,
  CONSTRAINT ck_room_types_guests CHECK (max_guests > 0),
  CONSTRAINT ck_room_types_price  CHECK (base_price >= 0),
  CONSTRAINT ck_room_types_area   CHECK (area_m2 IS NULL OR area_m2 > 0)
) ENGINE=InnoDB;

CREATE TABLE room_type_images (
  image_id      INT UNSIGNED NOT NULL AUTO_INCREMENT,
  room_type_id  INT UNSIGNED NOT NULL,
  url           VARCHAR(500) NOT NULL,
  sort_order    SMALLINT UNSIGNED NOT NULL DEFAULT 0,   -- sort_order = 0 là ảnh đại diện
  PRIMARY KEY (image_id),
  KEY ix_rt_images_rt (room_type_id, sort_order),
  CONSTRAINT fk_rt_images_rt FOREIGN KEY (room_type_id) REFERENCES room_types(room_type_id) ON DELETE CASCADE
) ENGINE=InnoDB;

-- hotel_id được lặp lại ở ROOMS để DB tự bảo đảm phòng thuộc đúng khách sạn của loại phòng.
-- Không có trạng thái 'occupied': "đang có khách" được suy ra từ BOOKINGS, tránh dữ liệu mâu thuẫn.
CREATE TABLE rooms (
  room_id       INT UNSIGNED NOT NULL AUTO_INCREMENT,
  hotel_id      INT UNSIGNED NOT NULL,
  room_type_id  INT UNSIGNED NOT NULL,
  room_number   VARCHAR(10)  NOT NULL,
  floor         TINYINT NULL,
  status        ENUM('available','cleaning','maintenance','inactive') NOT NULL DEFAULT 'available',
  created_at    DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at    DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (room_id),
  UNIQUE KEY uq_rooms_id_hotel (room_id, hotel_id),
  UNIQUE KEY uq_rooms_hotel_number (hotel_id, room_number),    -- không trùng số phòng trong 1 khách sạn
  KEY ix_rooms_type_status (room_type_id, status),
  CONSTRAINT fk_rooms_type_hotel FOREIGN KEY (room_type_id, hotel_id)
    REFERENCES room_types(room_type_id, hotel_id) ON DELETE RESTRICT
) ENGINE=InnoDB;

CREATE TABLE amenities (
  amenity_id  INT UNSIGNED NOT NULL AUTO_INCREMENT,
  name        VARCHAR(100) NOT NULL,
  icon        VARCHAR(100) NULL,
  PRIMARY KEY (amenity_id),
  UNIQUE KEY uq_amenities_name (name)
) ENGINE=InnoDB;

CREATE TABLE room_type_amenities (
  room_type_id  INT UNSIGNED NOT NULL,
  amenity_id    INT UNSIGNED NOT NULL,
  PRIMARY KEY (room_type_id, amenity_id),
  KEY ix_rta_amenity (amenity_id),
  CONSTRAINT fk_rta_rt FOREIGN KEY (room_type_id) REFERENCES room_types(room_type_id) ON DELETE CASCADE,
  CONSTRAINT fk_rta_am FOREIGN KEY (amenity_id)   REFERENCES amenities(amenity_id)   ON DELETE CASCADE
) ENGINE=InnoDB;

-- ---------------------------------------------------------------------
-- 3. DỊCH VỤ
-- ---------------------------------------------------------------------
CREATE TABLE services (
  service_id   INT UNSIGNED NOT NULL AUTO_INCREMENT,
  hotel_id     INT UNSIGNED NOT NULL,
  name         VARCHAR(100) NOT NULL,
  price        DECIMAL(12,0) NOT NULL,
  unit         VARCHAR(30) NULL,                        -- lượt / người / đêm
  status       ENUM('active','inactive') NOT NULL DEFAULT 'active',  -- ẩn thay vì xóa
  PRIMARY KEY (service_id),
  UNIQUE KEY uq_services_id_hotel (service_id, hotel_id),
  UNIQUE KEY uq_services_hotel_name (hotel_id, name),
  CONSTRAINT fk_services_hotel FOREIGN KEY (hotel_id) REFERENCES hotels(hotel_id) ON DELETE RESTRICT,
  CONSTRAINT ck_services_price CHECK (price >= 0)
) ENGINE=InnoDB;

-- ---------------------------------------------------------------------
-- 4. KHUYẾN MÃI
-- ---------------------------------------------------------------------
CREATE TABLE promotions (
  promotion_id      INT UNSIGNED NOT NULL AUTO_INCREMENT,
  code              VARCHAR(30)  NOT NULL,
  description       VARCHAR(255) NULL,
  discount_type     ENUM('percent','fixed') NOT NULL,
  discount_value    DECIMAL(12,0) NOT NULL,
  max_discount      DECIMAL(12,0) NULL,                 -- trần giảm khi dùng %
  min_order_amount  DECIMAL(12,0) NOT NULL DEFAULT 0,
  usage_limit       INT UNSIGNED NULL,                  -- NULL = không giới hạn
  used_count        INT UNSIGNED NOT NULL DEFAULT 0,
  start_date        DATE NOT NULL,
  end_date          DATE NOT NULL,
  is_active         TINYINT(1) NOT NULL DEFAULT 1,
  PRIMARY KEY (promotion_id),
  UNIQUE KEY uq_promotions_code (code),
  KEY ix_promotions_valid (is_active, start_date, end_date),
  CONSTRAINT ck_promo_dates   CHECK (end_date >= start_date),
  CONSTRAINT ck_promo_value   CHECK (discount_value > 0),
  CONSTRAINT ck_promo_percent CHECK (discount_type <> 'percent' OR discount_value <= 100),
  CONSTRAINT ck_promo_usage   CHECK (usage_limit IS NULL OR used_count <= usage_limit)
) ENGINE=InnoDB;

-- ---------------------------------------------------------------------
-- 5. ĐẶT PHÒNG
-- ---------------------------------------------------------------------
-- * user_id cho phép NULL để giữ tương thích dữ liệu/đơn khách vãng lai; luồng đặt phòng hiện tại yêu cầu đăng nhập.
-- * Mỗi đơn thuộc 1 khách sạn (hotel_id) -> phân quyền & thống kê đơn giản.
-- * Tách subtotal / discount / total để đối soát; CHECK bảo đảm cộng đúng.
CREATE TABLE bookings (
  booking_id         BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  booking_code       VARCHAR(20) NOT NULL,              -- mã hiển thị, vd BK00001
  hotel_id           INT UNSIGNED NOT NULL,
  user_id            INT UNSIGNED NULL,
  promotion_id       INT UNSIGNED NULL,
  guest_name         VARCHAR(100) NOT NULL,
  guest_email        VARCHAR(150) NOT NULL,
  guest_phone        VARCHAR(20)  NOT NULL,
  note               VARCHAR(500) NULL,
  num_guests         TINYINT UNSIGNED NOT NULL,
  subtotal_rooms     DECIMAL(12,0) NOT NULL DEFAULT 0,  -- bản chụp tại thời điểm đặt
  subtotal_services  DECIMAL(12,0) NOT NULL DEFAULT 0,
  discount_amount    DECIMAL(12,0) NOT NULL DEFAULT 0,  -- lưu số tiền, KHÔNG suy lại từ promotions
  total_amount       DECIMAL(12,0) NOT NULL DEFAULT 0,
  status             ENUM('pending','confirmed','checked_in','checked_out','cancelled') NOT NULL DEFAULT 'pending',
  cancelled_at       DATETIME NULL,
  created_at         DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at         DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (booking_id),
  UNIQUE KEY uq_bookings_code (booking_code),
  UNIQUE KEY uq_bookings_id_hotel (booking_id, hotel_id),
  UNIQUE KEY uq_bookings_id_user_hotel (booking_id, user_id, hotel_id),   -- cho REVIEWS
  KEY ix_bookings_user (user_id, created_at),
  KEY ix_bookings_hotel_status (hotel_id, status, created_at),            -- trang Admin
  KEY ix_bookings_status_created (status, created_at),
  KEY ix_bookings_promo (promotion_id),
  CONSTRAINT fk_bookings_hotel FOREIGN KEY (hotel_id)     REFERENCES hotels(hotel_id)       ON DELETE RESTRICT,
  CONSTRAINT fk_bookings_user  FOREIGN KEY (user_id)      REFERENCES users(user_id)         ON DELETE RESTRICT,
  CONSTRAINT fk_bookings_promo FOREIGN KEY (promotion_id) REFERENCES promotions(promotion_id) ON DELETE SET NULL,
  CONSTRAINT ck_bookings_guests CHECK (num_guests > 0),
  CONSTRAINT ck_bookings_money  CHECK (subtotal_rooms >= 0 AND subtotal_services >= 0
                                       AND discount_amount >= 0
                                       AND discount_amount <= subtotal_rooms + subtotal_services),
  CONSTRAINT ck_bookings_total  CHECK (total_amount = subtotal_rooms + subtotal_services - discount_amount)
) ENGINE=InnoDB;

-- Ngày ở nằm ở mức PHÒNG (mỗi phòng có thể ở khoảng ngày khác nhau) và index cùng với room_id
-- để truy vấn "phòng trống" chạy nhanh.
CREATE TABLE booking_details (
  detail_id        BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  booking_id       BIGINT UNSIGNED NOT NULL,
  hotel_id         INT UNSIGNED NOT NULL,
  room_id          INT UNSIGNED NOT NULL,
  check_in         DATE NOT NULL,
  check_out        DATE NOT NULL,
  nights           SMALLINT UNSIGNED AS (DATEDIFF(check_out, check_in)) STORED,
  price_per_night  DECIMAL(12,0) NOT NULL,              -- giá chụp tại thời điểm đặt
  PRIMARY KEY (detail_id),
  KEY ix_bd_room_dates (room_id, check_in, check_out),  -- kiểm tra trùng lịch
  KEY ix_bd_booking (booking_id),
  CONSTRAINT fk_bd_booking FOREIGN KEY (booking_id, hotel_id)
    REFERENCES bookings(booking_id, hotel_id) ON DELETE CASCADE,
  CONSTRAINT fk_bd_room FOREIGN KEY (room_id, hotel_id)
    REFERENCES rooms(room_id, hotel_id) ON DELETE RESTRICT,   -- phòng phải cùng khách sạn với đơn
  CONSTRAINT ck_bd_dates CHECK (check_out > check_in),
  CONSTRAINT ck_bd_price CHECK (price_per_night >= 0)
) ENGINE=InnoDB;

-- Khóa chính riêng (không dùng (booking_id, service_id)) để 1 đơn dùng cùng dịch vụ ở nhiều ngày/lần.
CREATE TABLE booking_services (
  booking_service_id  BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  booking_id          BIGINT UNSIGNED NOT NULL,
  hotel_id            INT UNSIGNED NOT NULL,
  service_id          INT UNSIGNED NOT NULL,
  quantity            SMALLINT UNSIGNED NOT NULL DEFAULT 1,
  unit_price          DECIMAL(12,0) NOT NULL,           -- giá chụp tại thời điểm đặt
  used_on             DATE NULL,
  PRIMARY KEY (booking_service_id),
  KEY ix_bs_booking (booking_id),
  KEY ix_bs_service (service_id),
  CONSTRAINT fk_bs_booking FOREIGN KEY (booking_id, hotel_id)
    REFERENCES bookings(booking_id, hotel_id) ON DELETE CASCADE,
  CONSTRAINT fk_bs_service FOREIGN KEY (service_id, hotel_id)
    REFERENCES services(service_id, hotel_id) ON DELETE RESTRICT,  -- dịch vụ phải cùng khách sạn
  CONSTRAINT ck_bs_qty   CHECK (quantity > 0),
  CONSTRAINT ck_bs_price CHECK (unit_price >= 0)
) ENGINE=InnoDB;

-- ---------------------------------------------------------------------
-- 6. THANH TOÁN
-- ---------------------------------------------------------------------
-- Hoàn tiền là 1 dòng riêng (payment_type='refund', amount dương) thay vì sửa dòng cũ
-- -> giữ lịch sử đầy đủ cho kế toán.
CREATE TABLE payments (
  payment_id        BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  booking_id        BIGINT UNSIGNED NOT NULL,
  amount            DECIMAL(12,0) NOT NULL,
  payment_type      ENUM('deposit','payment','refund') NOT NULL DEFAULT 'payment',
  method            ENUM('cash','card','bank_transfer','e_wallet') NOT NULL,
  status            ENUM('pending','paid','failed') NOT NULL DEFAULT 'pending',
  transaction_code  VARCHAR(100) NULL,                  -- mã giao dịch của cổng thanh toán
  provider          VARCHAR(30) NOT NULL DEFAULT 'manual',
  gateway_order_id  VARCHAR(120) NULL,
  gateway_payload   JSON NULL,
  paid_at           DATETIME NULL,
  created_at        DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (payment_id),
  UNIQUE KEY uq_payments_txn (transaction_code),        -- chống ghi trùng 1 giao dịch (NULL được lặp)
  UNIQUE KEY uq_payments_gateway_order (provider, gateway_order_id),
  KEY ix_payments_booking (booking_id, status),
  CONSTRAINT fk_payments_booking FOREIGN KEY (booking_id) REFERENCES bookings(booking_id) ON DELETE RESTRICT,
  CONSTRAINT ck_payments_amount CHECK (amount > 0),
  CONSTRAINT ck_payments_paid   CHECK (status <> 'paid' OR paid_at IS NOT NULL)
) ENGINE=InnoDB;

-- ---------------------------------------------------------------------
-- 7. ĐÁNH GIÁ
-- ---------------------------------------------------------------------
-- Khóa ngoại kép (booking_id, user_id, hotel_id) -> DB bảo đảm user_id và hotel_id của review
-- luôn KHỚP với đơn gốc, nên giữ cột hotel_id để tính điểm nhanh mà không sợ lệch dữ liệu.
CREATE TABLE reviews (
  review_id   INT UNSIGNED NOT NULL AUTO_INCREMENT,
  booking_id  BIGINT UNSIGNED NOT NULL,
  user_id     INT UNSIGNED NOT NULL,
  hotel_id    INT UNSIGNED NOT NULL,
  rating      TINYINT UNSIGNED NOT NULL,
  comment     TEXT NULL,
  status      ENUM('visible','hidden') NOT NULL DEFAULT 'visible',   -- kiểm duyệt
  created_at  DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (review_id),
  UNIQUE KEY uq_reviews_booking (booking_id),                        -- 1 đơn / 1 đánh giá
  KEY ix_reviews_hotel (hotel_id, status, created_at),
  KEY ix_reviews_user (user_id),
  CONSTRAINT fk_reviews_booking FOREIGN KEY (booking_id, user_id, hotel_id)
    REFERENCES bookings(booking_id, user_id, hotel_id) ON DELETE RESTRICT,
  CONSTRAINT ck_reviews_rating CHECK (rating BETWEEN 1 AND 5)
) ENGINE=InnoDB;

-- ---------------------------------------------------------------------
-- 8. TRIGGER NGHIỆP VỤ
-- ---------------------------------------------------------------------
DELIMITER //

-- Không cho 1 phòng thuộc 2 đơn chưa hủy có khoảng ngày chồng nhau.
-- (Vẫn cần transaction + SELECT ... FOR UPDATE trên dòng rooms khi tạo đơn để chặn race condition.)
CREATE TRIGGER trg_bd_no_overlap_ins BEFORE INSERT ON booking_details
FOR EACH ROW
BEGIN
  IF EXISTS (SELECT 1
               FROM booking_details d
               JOIN bookings b ON b.booking_id = d.booking_id
              WHERE d.room_id = NEW.room_id
                AND b.status <> 'cancelled'
                AND d.check_in  < NEW.check_out
                AND d.check_out > NEW.check_in) THEN
    SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Phong da duoc dat trong khoang ngay nay';
  END IF;
END//

CREATE TRIGGER trg_bd_no_overlap_upd BEFORE UPDATE ON booking_details
FOR EACH ROW
BEGIN
  IF NEW.room_id <> OLD.room_id OR NEW.check_in <> OLD.check_in OR NEW.check_out <> OLD.check_out THEN
    IF EXISTS (SELECT 1
                 FROM booking_details d
                 JOIN bookings b ON b.booking_id = d.booking_id
                WHERE d.room_id = NEW.room_id
                  AND d.detail_id <> OLD.detail_id
                  AND b.status <> 'cancelled'
                  AND d.check_in  < NEW.check_out
                  AND d.check_out > NEW.check_in) THEN
      SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Phong da duoc dat trong khoang ngay nay';
    END IF;
  END IF;
END//

-- Chỉ cho đánh giá khi đơn đã checked_out.
CREATE TRIGGER trg_reviews_checked_out BEFORE INSERT ON reviews
FOR EACH ROW
BEGIN
  IF (SELECT status FROM bookings WHERE booking_id = NEW.booking_id) <> 'checked_out' THEN
    SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Chi duoc danh gia khi don da checked_out';
  END IF;
END//

DELIMITER ;

-- ---------------------------------------------------------------------
-- 9. VIEW
-- ---------------------------------------------------------------------
-- Điểm trung bình tính từ reviews (không lưu cột dẫn xuất trong hotels -> không bao giờ lệch).
-- Nếu sau này lượng review rất lớn, có thể chuyển thành cột cache cập nhật bằng job.
CREATE VIEW v_hotel_rating AS
SELECT hotel_id, ROUND(AVG(rating), 2) AS avg_rating, COUNT(*) AS review_count
  FROM reviews
 WHERE status = 'visible'
 GROUP BY hotel_id;

-- ---------------------------------------------------------------------
-- 10. TRUY VẤN MẪU: tìm phòng trống của khách sạn @h trong khoảng @ci -> @co
-- ---------------------------------------------------------------------
-- SELECT r.room_id, r.room_number, rt.name, rt.base_price
--   FROM rooms r
--   JOIN room_types rt ON rt.room_type_id = r.room_type_id
--  WHERE r.hotel_id = @h AND r.status = 'available' AND rt.status = 'active'
--    AND NOT EXISTS (SELECT 1 FROM booking_details d
--                      JOIN bookings b ON b.booking_id = d.booking_id
--                     WHERE d.room_id = r.room_id AND b.status <> 'cancelled'
--                       AND d.check_in < @co AND d.check_out > @ci);
