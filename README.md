# VNHotel Đà Lạt — Website đặt phòng và quản lý khách sạn

VNHotel là đồ án môn học mô phỏng **một khách sạn duy nhất tại Đà Lạt**, không phải nền tảng chuỗi khách sạn toàn quốc. Ứng dụng dùng React + Vite, Node.js + Express và MySQL-compatible database (có thể dùng TiDB Cloud). Thư mục `legacy-dotnet-api/` là mã ASP.NET Core cũ để tham khảo, không nằm trong luồng chạy hiện tại.

## 1. Phạm vi và vai trò

### Khách hàng
- Đăng ký/đăng nhập bằng email, Google hoặc Apple.
- Tìm phòng tại VNHotel Đà Lạt theo ngày nhận phòng, ngày trả phòng và số khách.
- Xem hạng phòng, tiện nghi, giá và **số phòng vật lý còn trống trong đúng khoảng ngày đã chọn**.
- Tạo đơn đặt phòng; backend kiểm tra tồn phòng lần cuối trong transaction để tránh đặt trùng.
- Chọn thanh toán tại khách sạn, chuyển khoản VietQR hoặc cổng trực tuyến đã cấu hình.
- Xem lịch sử đơn và hủy đơn đang chờ theo điều kiện.

### Lễ tân (`staff`)
- Xem các đơn của VNHotel Đà Lạt.
- Đối soát chuyển khoản hoặc xác nhận đã thu tiền mặt tại quầy.
- Sau khi thanh toán hợp lệ, đơn chuyển sang `confirmed`.
- Cập nhật nhận phòng (`checked_in`) và trả phòng (`checked_out`).
- Cập nhật tình trạng phòng: đang mở bán, đang dọn, bảo trì hoặc ngừng khai thác.

### Quản trị viên (`admin`)
- Xem dashboard và doanh thu của khách sạn Đà Lạt.
- Quản lý hạng phòng, tạo hạng phòng mới và thêm nhiều phòng vật lý vào một hạng phòng đã có.
- Quản lý tài khoản; chuyển tài khoản khách hàng thành lễ tân hoặc ngược lại.
- Quản lý khách sạn không có chức năng thêm khách sạn khác vì đồ án chỉ vận hành một khách sạn.

## 2. Quy trình đặt phòng và thanh toán

1. Khách chọn ngày và số khách; website gọi API kiểm tra số phòng còn trống.
2. Khách chọn hạng phòng và tạo đơn. Backend khóa loại phòng, tìm một phòng vật lý không bị trùng lịch và tạo đơn ở trạng thái `pending`.
3. Khách chọn phương thức thanh toán:
   - Thanh toán trực tuyến (MoMo/ZaloPay/PayPal): hệ thống xác nhận khi callback/capture hợp lệ.
   - Chuyển khoản: đơn chờ lễ tân đối soát giao dịch.
   - Tiền mặt tại khách sạn: đơn chờ lễ tân xác nhận đã thu tiền tại quầy.
4. Khi thanh toán được xác nhận, payment chuyển `paid` và booking chuyển `confirmed`.
5. Lễ tân cập nhật `checked_in`, sau đó `checked_out` khi khách trả phòng.

Đơn `pending` vẫn giữ chỗ trong lịch phòng để tránh khách khác đặt trùng. Đơn bị hủy không còn chiếm lịch.

## 3. Yêu cầu

- Node.js 22.12 trở lên (theo `package.json`).
- TiDB Cloud hoặc MySQL 8 tương thích.
- Trình duyệt Chrome/Edge/Firefox hiện đại.

## 4. Database

### Database mới

```bash
mysql -u root -p < database/schema.sql
mysql -u root -p < database/data.sql
```

**Cảnh báo:** `database/schema.sql` chứa lệnh `DROP TABLE`. Chỉ chạy khi tạo database mới hoặc khi đã sao lưu và chấp nhận xóa dữ liệu hiện tại. `data.sql` tạo một khách sạn mẫu VNHotel Đà Lạt với 4 hạng phòng và 8 phòng vật lý; không tạo đơn mẫu cũ.

### Database TiDB đang sử dụng từ bản trước

Nếu bạn đã có TiDB `hotel_booking` chứa dữ liệu, **không chạy lại `schema.sql` và không chạy lại `data.sql`**. Hãy sao lưu database, sau đó mở TiDB Cloud → SQL Editor và chạy một lần:

```text
database/migrations/20261120_single_hotel_dalat.sql
```

Migration chỉ chuyển các khách sạn ngoài Đà Lạt sang `inactive`, không xóa khách sạn, phòng, đơn hoặc thanh toán cũ. Các API của phiên bản này chỉ truy vấn khách sạn có `city = 'Đà Lạt'`.

Kiểm tra sau migration:

```sql
SELECT hotel_id, name, city, status FROM hotels WHERE city = 'Đà Lạt';
SELECT hotel_id, name, city, status FROM hotels WHERE status = 'active';
```

Cần có ít nhất một dòng khách sạn Đà Lạt. Nếu database hiện tại chưa có, hãy thêm một bản ghi khách sạn Đà Lạt bằng SQL phù hợp với dữ liệu thực tế trước khi sử dụng website.

## 5. Chạy local trên Windows

### Backend

```powershell
cd backend
copy .env.example .env
npm install
```

Mở `backend/.env`, cấu hình tối thiểu:

```env
NODE_ENV=development
PORT=5000
CLIENT_URL=http://localhost:5173
API_PUBLIC_URL=http://localhost:5000
JWT_SECRET=CHUOI_BI_MAT_NGAU_NHIEN_DAI_TREN_32_KY_TU
DB_HOST=127.0.0.1
DB_PORT=3306
DB_USER=root
DB_PASSWORD=MAT_KHAU_DATABASE
DB_NAME=hotel_booking
DB_SSL=false
DB_CONNECTION_LIMIT=3
SINGLE_HOTEL_CITY=Đà Lạt
```

Nếu dùng TiDB Cloud, lấy đúng HOST/PORT/USERNAME từ mục Connect của TiDB và bật `DB_SSL=true`, `DB_SSL_REJECT_UNAUTHORIZED=true`. Không dùng username `root` nếu TiDB hiển thị username có prefix riêng.

Tạo tài khoản quản trị:

```powershell
npm run seed:admin
```

Nếu không đặt biến seed, script dùng tài khoản demo `admin@vnhotel.vn` / `Admin@12345`; hãy đổi mật khẩu ngay sau lần đăng nhập đầu tiên. Sau đó chạy:

```powershell
npm run dev
```

API health check: `http://localhost:5000/api/health`.

### Frontend

Mở terminal khác:

```powershell
cd frontend
copy .env.example .env
npm install
npm run dev
```

Mở `http://localhost:5173`.

## 6. Phân quyền lễ tân

1. Lễ tân đăng ký một tài khoản khách hàng bình thường trên website.
2. Quản trị viên đăng nhập, mở **Quản lý khách sạn → Tài khoản & lễ tân**.
3. Đổi vai trò tài khoản đó từ **Khách hàng** sang **Lễ tân**.
4. Người dùng đăng xuất và đăng nhập lại để nhận quyền mới; menu **Quản lý khách sạn** sẽ xuất hiện.

Đồ án chỉ có một khách sạn nên lễ tân được phép xử lý dữ liệu của VNHotel Đà Lạt, không có phân quyền theo tỉnh/thành.

## 7. Google / Apple / Email

### Google
- Tạo OAuth Client ID loại Web application.
- Thêm Authorized JavaScript origins gồm local origin và domain production.
- Cùng Client ID được đặt vào `GOOGLE_CLIENT_ID` phía backend và `VITE_GOOGLE_CLIENT_ID` phía frontend.
- Trên Vercel, `VITE_GOOGLE_CLIENT_ID` phải được áp dụng cho đúng môi trường deployment (Production/Preview) và cần deploy lại sau khi thay đổi.

### Apple
- Cần Apple Developer Program, Services ID, Team ID, Key ID và private key `.p8`.
- Domain và Return URL HTTPS phải khớp chính xác với cấu hình Apple Developer.

### Email
- SMTP Gmail cần App Password; không dùng mật khẩu Gmail thông thường.
- Không đưa secret OAuth, SMTP hoặc JWT vào biến `VITE_` và không commit file `.env`.

## 8. Thanh toán

- **Thanh toán tại khách sạn:** khách chọn khi checkout; lễ tân xác nhận đã thu tiền bằng nút “Xác nhận đã thu”.
- **Chuyển khoản VietQR:** cấu hình `BANK_BIN`, `BANK_ACCOUNT_NO`, `BANK_ACCOUNT_NAME`; lễ tân đối soát trước khi xác nhận. Giá trị mẫu trong `.env.example` là DEMO, không dùng nhận tiền thật.
- **MoMo/ZaloPay:** cần merchant credentials và callback URL công khai HTTPS. Backend xác minh chữ ký callback.
- **PayPal:** cần REST App credentials và tỷ giá VND/USD được đơn vị vận hành cập nhật.

## 9. Deploy Vercel

- Root project sử dụng workspace npm; Build Command: `npm run build`.
- Khai báo các biến backend (`DB_*`, `JWT_SECRET`, Google/Apple/payment secrets) trong Vercel Environment Variables.
- `VITE_GOOGLE_CLIENT_ID` là biến build-time cho frontend; đặt đúng Production hoặc Preview theo deployment cần dùng.
- TiDB Cloud Public Endpoint cần TLS: `DB_SSL=true`, `DB_SSL_REJECT_UNAUTHORIZED=true`.
- Mặc định app giới hạn dữ liệu ở `Đà Lạt`; không cần thêm biến `SINGLE_HOTEL_CITY` nếu giữ nguyên phạm vi đồ án.
- Sau khi đổi Environment Variables mới cần Redeploy. Không cần redeploy chỉ vì sửa dữ liệu SQL; migration database chạy trực tiếp trong TiDB SQL Editor.

## 10. API chính

| Method | Endpoint | Mô tả |
|---|---|---|
| GET | `/api/hotels` | Khách sạn VNHotel Đà Lạt |
| GET | `/api/rooms` | Tìm hạng phòng, có thể truyền `checkIn`, `checkOut`, `guests` |
| GET | `/api/rooms/:id` | Chi tiết và tình trạng phòng theo ngày |
| POST | `/api/bookings` | Tạo đơn, cần đăng nhập |
| GET | `/api/bookings/my` | Lịch sử đơn của tài khoản |
| POST | `/api/payments` | Tạo giao dịch |
| GET | `/api/payments/config` | Phương thức thanh toán đang bật |
| PATCH | `/api/payments/:id/confirm-bank` | Lễ tân đối soát chuyển khoản |
| PATCH | `/api/payments/:id/confirm-cash` | Lễ tân xác nhận thu tiền mặt |
| GET | `/api/admin/stats` | Dashboard khách sạn |
| GET | `/api/admin/bookings` | Đơn đặt phòng Đà Lạt |
| GET | `/api/admin/rooms` | Danh sách phòng vật lý |
| POST | `/api/admin/room-types/:id/rooms` | Thêm phòng vật lý vào hạng phòng có sẵn (admin) |
| PATCH | `/api/admin/bookings/:id/status` | Nhận phòng, trả phòng hoặc hủy đơn |
| PATCH | `/api/admin/users/:id/role` | Admin phân quyền khách hàng/lễ tân |

## 11. Kiểm tra trước khi nộp đồ án

```bash
npm install
npm run build
```

Kiểm thử thực tế trên TiDB: tìm phòng với hai khoảng ngày khác nhau, tạo đơn, thử tạo đơn trùng, xác nhận thanh toán tiền mặt/chuyển khoản ở vai trò lễ tân, nhận phòng và trả phòng. Việc build thành công chưa thay thế kiểm thử trên database production.
