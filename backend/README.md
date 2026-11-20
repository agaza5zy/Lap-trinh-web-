# VNHotel Backend

Node.js 22+ / Express / MySQL-compatible database. Backend là API đang được React frontend sử dụng.

```bash
copy .env.example .env
# Điền DB_HOST, DB_PORT, DB_USER, DB_PASSWORD, DB_NAME và JWT_SECRET
npm install
npm run seed:admin
npm run dev
```

API health check: `GET http://localhost:5000/api/health`.

Mặc định API giới hạn dữ liệu về một khách sạn có `city = 'Đà Lạt'` (`SINGLE_HOTEL_CITY`). Khi dùng TiDB Cloud Public Endpoint, bật `DB_SSL=true` và dùng username/mật khẩu đúng từ TiDB Connect.

Vai trò: `customer` là khách hàng, `staff` là lễ tân, `admin` là quản trị viên. Lễ tân được phép xử lý đơn, đối soát chuyển khoản/tiền mặt, nhận phòng và trả phòng. Admin có thể đổi vai trò người dùng từ trang quản trị.

Xem root `README.md` để biết migration TiDB, Google/Apple OAuth, SMTP, thanh toán và Vercel.
