# Database VNHotel Đà Lạt

Database dùng MySQL 8-compatible engine (có thể dùng TiDB Cloud). Ứng dụng được cấu hình chỉ vận hành một khách sạn tại Đà Lạt.

## Tạo database mới

```bash
mysql -u root -p < schema.sql
mysql -u root -p < data.sql
```

Sau đó chạy `npm run seed:admin` trong thư mục `backend` để tạo mật khẩu bcrypt cho tài khoản quản trị demo.

> **Cảnh báo:** `schema.sql` có lệnh `DROP TABLE`. Chỉ chạy trên database mới hoặc sau khi đã sao lưu và chấp nhận xóa dữ liệu cũ. `data.sql` tạo một khách sạn VNHotel Đà Lạt, 4 hạng phòng, 8 phòng vật lý và tiện nghi mẫu.

## Nâng cấp database TiDB đang có

Nếu TiDB `hotel_booking` đã được tạo từ source trước, không chạy lại `schema.sql` hoặc `data.sql`. Sao lưu trước, sau đó chạy một lần:

```text
migrations/20261120_single_hotel_dalat.sql
```

Migration chỉ ẩn các khách sạn ngoài Đà Lạt bằng cách đổi trạng thái sang `inactive`; không xóa dữ liệu lịch sử. Backend/frontend cũng lọc dữ liệu theo `city = 'Đà Lạt'`.

Migration trước đó `20261119_auth_social_payments.sql` chỉ dành cho database cũ chưa có các bảng/cột OAuth và thanh toán. Không chạy nếu những cấu trúc đó đã tồn tại.

## File chính

| File | Mục đích |
|---|---|
| `schema.sql` | Bảng, khóa ngoại, index, trigger và view |
| `data.sql` | Dữ liệu mẫu một khách sạn Đà Lạt |
| `queries.sql` | Truy vấn SQL tham khảo |
| `migrations/20261119_auth_social_payments.sql` | Nâng cấp OAuth/thanh toán cho schema cũ |
| `migrations/20261120_single_hotel_dalat.sql` | Chuyển dữ liệu đang có sang phạm vi một khách sạn Đà Lạt |
| `docs/` | ERD và tài liệu thiết kế CSDL |

## Tài khoản lễ tân

Khách hàng đăng ký tài khoản bình thường trước. Quản trị viên vào trang quản lý tài khoản trên website và đổi vai trò thành `staff` (Lễ tân). Không cần tạo bảng hoặc chạy migration riêng cho vai trò này vì enum `users.role` đã có `customer`, `staff`, `admin`.
