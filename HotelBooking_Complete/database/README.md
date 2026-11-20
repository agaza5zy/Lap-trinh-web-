# Database VNHotel

Yêu cầu: MySQL 8.0+ (khuyến nghị) hoặc MariaDB tương thích.

## Cài đặt database mới

```bash
mysql -u root -p < schema.sql
mysql -u root -p < data.sql
```

Sau đó chạy `npm run seed:admin` trong thư mục `backend` để đặt mật khẩu bcrypt cho tài khoản quản trị demo.

> **Cảnh báo:** `schema.sql` chứa `DROP TABLE` để tạo lại schema. Chỉ chạy trên database mới hoặc sau khi đã sao lưu và chấp nhận xóa dữ liệu cũ.

## Nâng cấp database cũ

Nếu đã có database từ bản source trước, hãy sao lưu trước và chạy `migrations/20261119_auth_social_payments.sql`. Không chạy migration này sau khi đã import schema.sql phiên bản mới vì các cột đã tồn tại.

| File | Mục đích |
|---|---|
| `schema.sql` | Cấu trúc bảng, khóa ngoại, index, trigger và view |
| `data.sql` | Dữ liệu mẫu khách sạn, loại phòng, phòng, tiện nghi và đơn mẫu |
| `queries.sql` | Truy vấn SQL tham khảo |
| `migrations/` | Nâng cấp cấu trúc từ schema cũ |
| `docs/` | ERD và tài liệu thiết kế CSDL từ source gốc |

## Dùng với Vercel

Vercel không chạy MySQL trong project. Hãy tạo MySQL cloud riêng, chạy `schema.sql` và `data.sql` trên database mới, sau đó khai báo `DB_HOST`, `DB_PORT`, `DB_USER`, `DB_PASSWORD`, `DB_NAME`, `DB_SSL` và `DB_CONNECTION_LIMIT` trong Vercel Environment Variables. Không chạy lại `schema.sql` trên database đang chứa dữ liệu cần giữ.
