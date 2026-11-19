# VNHotel — Website quản lý và đặt phòng khách sạn

Dự án được hoàn thiện dựa trên source `HotelBooking.rar` đã cung cấp. Ứng dụng sử dụng **React + Vite** cho giao diện, **Node.js + Express** cho REST API và **MySQL 8** cho dữ liệu. Thư mục `legacy-dotnet-api/` chỉ lưu bản ASP.NET Core chưa hoàn chỉnh trong source gốc để tham khảo; không cần chạy thư mục này.

## 1. Chức năng đã triển khai

### Khách hàng
- Đăng ký bằng địa chỉ Gmail và mật khẩu; xác minh email qua SMTP/Gmail App Password.
- Đăng nhập bằng Gmail/mật khẩu, Google Identity Services và Sign in with Apple.
- Tìm kiếm khách sạn/phòng theo điểm đến, số khách, ngày nhận/trả phòng; lọc và sắp xếp giá.
- Xem thông tin phòng, tiện nghi, số phòng đang mở bán.
- Đặt phòng có kiểm tra lịch trống trong transaction MySQL; ngăn hai đơn đặt trùng một phòng trong cùng khoảng ngày.
- Áp dụng mã khuyến mãi; xem lịch sử và trạng thái đơn; hủy đơn theo điều kiện.
- Chọn chuyển khoản ngân hàng (VietQR), MoMo, ZaloPay hoặc PayPal.
- Xem mã QR, số tài khoản, số tiền và nội dung chuyển khoản; trạng thái chỉ được xác nhận sau khi nhận callback hợp lệ hoặc nhân viên đối soát.

### Quản trị
- Dashboard: tổng đơn, đơn chờ thanh toán, số phòng mở bán, doanh thu đã thu.
- Quản lý khách sạn: thêm khách sạn, địa chỉ, thành phố, hạng sao, ảnh đại diện; bật / tắt hiển thị.
- Quản lý đơn: xác nhận, nhận phòng, trả phòng, hủy; đối soát chuyển khoản ngân hàng.
- Quản lý phòng vật lý: trạng thái đang mở bán, dọn phòng, bảo trì, ngừng khai thác.
- Tạo loại phòng mới và phòng vật lý đầu tiên.
- Quản lý tài khoản khách hàng (khóa/mở khóa; chỉ admin).

## 2. Yêu cầu

- Node.js 20 trở lên (khuyến nghị Node.js 22).
- MySQL 8.0+ (hoặc MariaDB tương thích với schema).
- Trình duyệt Chrome/Edge/Firefox hiện đại.
- Docker Desktop là tùy chọn để chạy MySQL nhanh.

## 3. Cài đặt nhanh trên Windows

### Bước 1 — Khởi động MySQL

Nếu đã cài MySQL Server, tạo database bằng cách chạy hai lệnh sau trong thư mục dự án:

```bash
mysql -u root -p < database/schema.sql
mysql -u root -p < database/data.sql
```

**Chú ý:** `database/schema.sql` có lệnh `DROP TABLE` để tạo lại toàn bộ schema. Chỉ chạy trên database mới hoặc khi bạn chấp nhận xóa dữ liệu cũ. Nếu đang dùng database từ bản source trước, hãy sao lưu rồi chạy file `database/migrations/20261119_auth_social_payments.sql` thay vì chạy lại schema.

Nếu dùng Docker Desktop:

```bash
docker compose up -d mysql
```

Docker Compose tạo MySQL với thông tin phát triển:
- Host: `127.0.0.1`
- Port: `3306`
- User: `root`
- Password: `vnhotel_dev_password`
- Database: `hotel_booking`

Các file SQL tự chạy khi volume MySQL được tạo lần đầu. Nếu volume đã tồn tại từ lần chạy trước, các file init không tự chạy lại.

### Bước 2 — Cấu hình backend

```bash
cd backend
copy .env.example .env
npm install
```

Mở `backend/.env` và sửa tối thiểu:

```env
NODE_ENV=development
PORT=5000
CLIENT_URL=http://localhost:5173
API_PUBLIC_URL=http://localhost:5000
JWT_SECRET=THAY_BANG_CHUOI_BI_MAT_DAI_TREN_32_KY_TU
DB_HOST=127.0.0.1
DB_PORT=3306
DB_USER=root
DB_PASSWORD=vnhotel_dev_password
DB_NAME=hotel_booking
```

Nếu sử dụng MySQL cài trực tiếp, thay `DB_PASSWORD` theo mật khẩu MySQL của bạn.

Tạo tài khoản quản trị:

```bash
npm run seed:admin
```

Tài khoản demo mặc định:
- Email: `admin@vnhotel.vn`
- Mật khẩu: `Admin@12345`

Đổi mật khẩu demo ngay sau khi đăng nhập. Có thể đặt `SEED_ADMIN_EMAIL` và `SEED_ADMIN_PASSWORD` trong `.env` trước khi chạy lệnh seed.

Chạy API:

```bash
npm run dev
```

Kiểm tra API tại `http://localhost:5000/api/health`.

### Bước 3 — Cấu hình frontend

Mở cửa sổ Terminal khác:

```bash
cd frontend
copy .env.example .env
npm install
npm run dev
```

Mở `http://localhost:5173`.

Sau khi đã tạo hai file `.env`, có thể dùng `start-windows.bat` để mở backend và frontend ở hai cửa sổ riêng. MySQL phải được khởi động trước.

## 4. Cấu hình đăng ký Gmail và đăng nhập Google / Apple

### Gmail (email + mật khẩu)

Đăng ký yêu cầu địa chỉ `@gmail.com`. Để gửi email xác minh thật, tạo **Google App Password** cho tài khoản Gmail dùng gửi thư (bật xác minh 2 bước trước), sau đó điền các biến sau trong `backend/.env`:

```env
SMTP_HOST=smtp.gmail.com
SMTP_PORT=465
SMTP_SECURE=true
SMTP_USER=your-business-email@gmail.com
SMTP_PASS=YOUR_GMAIL_APP_PASSWORD
MAIL_FROM="VNHotel <your-business-email@gmail.com>"
EMAIL_VERIFICATION_REQUIRED=true
```

Không dùng mật khẩu Gmail thông thường và không đưa App Password vào frontend. Khi chưa cấu hình SMTP trong môi trường development, API in liên kết xác minh ra terminal và giao diện hiển thị liên kết thử nghiệm. Ở production, SMTP chưa cấu hình sẽ không được chấp nhận.

### Google

1. Tạo OAuth Client ID loại **Web application** trong Google Cloud Console.
2. Thêm Authorized JavaScript origin, ví dụ `http://localhost:5173` và domain production.
3. Đặt cùng Client ID vào `GOOGLE_CLIENT_ID` trong `backend/.env` và `VITE_GOOGLE_CLIENT_ID` trong `frontend/.env`.
4. Khởi động lại cả frontend và backend.

Backend xác minh Google ID token bằng thư viện Google Auth Library, kiểm tra audience, subject, Gmail đã xác minh và nonce dùng một lần; đồng thời dùng CSRF cookie/body double-submit. Không tin email hoặc user ID do trình duyệt tự gửi. Dùng cùng hostname cho frontend và API trong local (ví dụ cả hai đều `localhost`, không trộn `localhost` với `127.0.0.1`) để trình duyệt gửi cookie CSRF.

### Apple

1. Cần Apple Developer Program và một primary App ID đã bật Sign in with Apple (Apple yêu cầu website được liên kết với App ID hiện có), sau đó tạo **Services ID** cho website.
2. Cấu hình domain và Return URL HTTPS tuyệt đối (đúng cả scheme, host và path) trong Apple Developer; Apple không chấp nhận `localhost` hoặc IP làm redirect domain.
3. Tạo Sign in with Apple key, lấy Team ID, Key ID và file `.p8`.
4. Điền `APPLE_CLIENT_ID`, `APPLE_TEAM_ID`, `APPLE_KEY_ID`, `APPLE_PRIVATE_KEY`, `APPLE_REDIRECT_URI` ở backend và `VITE_APPLE_CLIENT_ID`, `VITE_APPLE_REDIRECT_URI` ở frontend.
5. Redirect URI phải khớp chính xác với cấu hình Apple; Apple không cho dùng `localhost` hoặc địa chỉ IP làm domain callback. Vì vậy đăng nhập Apple cần domain HTTPS công khai (có thể dùng tunnel HTTPS khi phát triển).

Backend tạo client-secret JWT, đổi authorization code qua Apple Token endpoint và xác minh identity token, issuer, audience, thời hạn và nonce.

## 5. Cấu hình thanh toán và QR

Các khóa merchant chỉ được đặt ở `backend/.env`. Không đặt secret key trong React/Vite, không commit file `.env` lên Git.

### Chuyển khoản ngân hàng / VietQR

```env
BANK_BIN=970436
BANK_ACCOUNT_NO=YOUR_REAL_ACCOUNT_NUMBER
BANK_ACCOUNT_NAME=YOUR_ACCOUNT_HOLDER_NAME
BANK_NAME=YOUR_BANK_NAME
BANK_TRANSFER_DEMO=false
```

`BANK_BIN=970436` là mã BIN ví dụ của Vietcombank. Hãy thay BIN, số tài khoản và tên chủ tài khoản theo tài khoản nhận tiền thực tế. Source mẫu dùng `BANK_TRANSFER_DEMO=true` và số tài khoản giả để tránh nhầm đây là tài khoản nhận tiền thật. QR được tạo theo số tiền và nội dung `VNHOTEL <mã đơn>`. Chuyển khoản ngân hàng không có callback tự động trong cấu hình cơ bản; nhân viên cần đối soát giao dịch trong trang quản trị rồi xác nhận.

### MoMo

Đăng ký tài khoản merchant MoMo và lấy Partner Code, Access Key, Secret Key cho môi trường thử nghiệm trước. Điền:

```env
MOMO_ENV=sandbox
MOMO_PARTNER_CODE=...
MOMO_ACCESS_KEY=...
MOMO_SECRET_KEY=...
MOMO_PARTNER_NAME=VNHotel
MOMO_STORE_ID=VNHotel
```

Khi deploy, đổi `MOMO_ENV=production`, cập nhật credentials production và đăng ký đúng `API_PUBLIC_URL` / IPN URL với MoMo. Callback phải được xác minh HMAC-SHA256 trước khi đánh dấu thanh toán.

### ZaloPay

Đăng ký merchant ZaloPay và điền:

```env
ZALOPAY_ENV=sandbox
ZALOPAY_APP_ID=...
ZALOPAY_KEY1=...
ZALOPAY_KEY2=...
```

Khi production, đặt `ZALOPAY_ENV=production` và đăng ký callback URL công khai. Source tạo order qua `/v2/create`, ký request bằng key1 và xác minh callback bằng key2.

### PayPal

Tạo REST App trong PayPal Developer Dashboard, lấy Client ID và Secret. PayPal Checkout trong source sử dụng Orders v2 (create order ở backend, capture ở backend sau khi người dùng chấp thuận). Giao dịch ví dụ dùng USD; cấu hình tỷ giá quy đổi VND/USD do đơn vị vận hành cung cấp:

```env
PAYPAL_ENV=sandbox
PAYPAL_CLIENT_ID=...
PAYPAL_CLIENT_SECRET=...
PAYPAL_VND_PER_USD=YOUR_CURRENT_VND_PER_USD_RATE
PAYPAL_CURRENCY=USD
```

Không tự ý dùng tỷ giá mẫu để thu tiền thật. Cập nhật tỷ giá và chính sách làm tròn trước khi bật PayPal production.

### Callback khi chạy local

MoMo và ZaloPay cần gọi ngược vào `API_PUBLIC_URL`. `http://localhost:5000` không thể được cổng thanh toán truy cập từ Internet. Khi thử nghiệm callback, dùng domain HTTPS/tunnel công khai và đăng ký đúng callback URL trong merchant portal. Không mở cổng API trực tiếp ra Internet nếu chưa cấu hình HTTPS, firewall, secrets và domain production.

## 6. Tài liệu tích hợp chính thức

- Google Identity Services: [JavaScript API reference](https://developers.google.com/identity/gsi/web/reference/js-reference) và [xác minh ID token phía máy chủ](https://developers.google.com/identity/gsi/web/guides/verify-google-id-token).
- Apple: [Sign in with Apple JS](https://developer.apple.com/documentation/signinwithapplejs), [xác minh người dùng](https://developer.apple.com/documentation/signinwithapple/verifying-a-user) và [cấu hình môi trường](https://developer.apple.com/documentation/signinwithapple/configuring-your-environment-for-sign-in-with-apple).
- ZaloPay: [Create Order](https://docs.zalopay.vn/docs/specs/order-create/) và [Callback](https://docs.zalopay.vn/docs/specs/callback-api/).
- PayPal: [Standard Checkout integration](https://developer.paypal.com/studio/checkout/standard/integrate).
- MoMo: [Developer documentation](https://developers.momo.vn/).

## 7. API chính

| Method | Endpoint | Mô tả |
|---|---|---|
| POST | `/api/auth/register` | Đăng ký Gmail |
| POST | `/api/auth/verify-email` | Xác minh email |
| POST | `/api/auth/login` | Đăng nhập email/mật khẩu |
| GET | `/api/auth/google/nonce` | Cấp nonce + CSRF cookie cho Google |
| POST | `/api/auth/google` | Đăng nhập Google |
| GET | `/api/auth/apple/nonce` | Cấp nonce + CSRF cookie cho Apple |
| POST | `/api/auth/apple` | Đăng nhập Apple |
| GET | `/api/rooms` | Tìm kiếm loại phòng |
| GET | `/api/rooms/:id` | Chi tiết loại phòng |
| POST | `/api/bookings` | Tạo đơn đặt phòng (cần đăng nhập) |
| GET | `/api/bookings/my` | Lịch sử đặt phòng |
| POST | `/api/payments` | Tạo giao dịch thanh toán |
| GET | `/api/payments/config` | Trạng thái cấu hình cổng thanh toán |
| POST | `/api/payments/momo/ipn` | MoMo IPN callback |
| POST | `/api/payments/zalopay/callback` | ZaloPay callback |
| POST | `/api/payments/paypal/capture` | Capture đơn PayPal sau khi người dùng duyệt |
| PATCH | `/api/payments/:id/confirm-bank` | Admin đối soát chuyển khoản |
| GET | `/api/admin/stats` | Thống kê quản trị |
| GET / POST | `/api/admin/hotels` | Danh sách / tạo khách sạn |
| GET | `/api/admin/bookings` | Danh sách đơn |
| GET | `/api/admin/rooms` | Danh sách phòng |

Các endpoint quản trị cần JWT với vai trò admin/staff; quản lý người dùng và tạo loại phòng mới chỉ dành cho admin.

## 8. Kiểm tra / build

```bash
cd backend
npm install
npm run seed:admin
npm run dev
```

```bash
cd frontend
npm install
npm run build
npm run lint
```

## 9. Triển khai VNHotel lên Vercel (`.vercel.app`)

Source đã được cấu hình để Vercel triển khai **React/Vite + Express API** trên cùng một hostname. Vercel chạy Express từ `server.js`; Vite build giao diện vào thư mục gốc `public/`. Các đường dẫn `/api/...` tiếp tục được Express xử lý, còn các route React Router như `/rooms`, `/account`, `/admin` được trả về `index.html`.

> Vercel không chạy MySQL server bên trong project. Bạn phải tạo một MySQL database bên ngoài (dịch vụ cloud MySQL), cho phép kết nối từ ứng dụng Vercel và nhập schema/dữ liệu vào database đó. Không dùng `docker-compose` để mong chạy MySQL trên Vercel.

### 9.1. Chuẩn bị MySQL cloud

1. Tạo một database MySQL 8 trên nhà cung cấp cloud database bạn chọn.
2. Lấy host, port, database name, username, password và CA certificate (nếu nhà cung cấp yêu cầu).
3. Nên đặt tên database cloud là `hotel_booking` để dùng nguyên trạng hai file SQL. Nếu nhà cung cấp cấp tên database khác hoặc không cho quyền `CREATE DATABASE`, trong `database/schema.sql` hãy xóa phần `CREATE DATABASE ...` và `USE hotel_booking;`, trong `database/data.sql` xóa dòng `USE hotel_booking;`; sau đó chọn đúng database đích trong SQL console trước khi chạy lần lượt hai file. Đặt `DB_NAME` trùng tên database cloud thực tế. Chạy trên **database mới**; `schema.sql` có lệnh `DROP TABLE`, tuyệt đối không chạy lại trên database đang có dữ liệu cần giữ.
4. Nếu nhà cung cấp yêu cầu TLS, đặt `DB_SSL=true`. Nếu họ cung cấp CA certificate, đưa nội dung PEM vào `DB_SSL_CA` (giữ newline hoặc thay newline bằng `\\n`).
5. Đảm bảo dịch vụ MySQL cho phép kết nối từ Vercel. Nếu nhà cung cấp bắt buộc IP allowlist nhưng gói Vercel của bạn không có egress IP cố định, hãy chọn cấu hình database/network phù hợp; không mở quyền truy cập database công khai không giới hạn nếu nhà cung cấp có lựa chọn an toàn hơn.

### 9.2. Đưa source lên GitHub

1. Giải nén `HotelBooking_VNHotel_Vercel.zip`.
2. Tạo một repository GitHub mới và upload toàn bộ nội dung thư mục `HotelBooking_Complete` (bao gồm `package.json`, `server.js`, `vercel.json`, `backend/`, `frontend/`, `database/`).
3. Không upload bất kỳ file `.env` nào, mật khẩu database, Gmail App Password, khóa Apple `.p8` hoặc secret merchant.

Có thể dùng GitHub Desktop để tạo repository và push source nếu không quen dùng Git command line. Nếu muốn deploy bằng CLI thay vì import GitHub, cài Vercel CLI (`npm install -g vercel`), chạy `vercel login`, `vercel` để liên kết project và `vercel --prod` để deploy production.

### 9.3. Import project vào Vercel

1. Đăng nhập [Vercel](https://vercel.com/), chọn **Add New → Project**, rồi import repository GitHub.
2. Đặt Project Name, ví dụ `vnhotel-booking`. Tên này sẽ tạo URL dạng `https://vnhotel-booking.vercel.app` nếu tên còn khả dụng.
3. Đặt **Root Directory** là `./` (thư mục gốc repository).
4. Nếu Vercel hỏi Build Settings, dùng:
   - Framework Preset: giữ `Express` nếu Vercel tự nhận diện; nếu không nhận diện thì chọn `Other` (ứng dụng có Express entrypoint ở `server.js`).
   - Install Command: `npm install`.
   - Build Command: `npm run build`.
   - Output Directory: để mặc định/không override; Vite đã xuất file tĩnh vào `public/`.
5. Có thể deploy lần đầu để tạo project domain. Sau đó thêm Environment Variables ở Project → Settings → Environment Variables và redeploy.

### 9.4. Environment Variables trên Vercel

Thêm các biến trong bảng sau. Chọn ít nhất **Production**; chọn thêm **Preview** nếu muốn các deployment thử nghiệm dùng chung database. Các giá trị `VITE_...` phải được khai báo trước khi build vì chúng được nhúng vào frontend.

| Key | Giá trị cần nhập |
|---|---|
| `NODE_ENV` | `production` |
| `SERVE_FRONTEND` | `true` |
| `CLIENT_URL` | `https://TEN_PROJECT.vercel.app` |
| `API_PUBLIC_URL` | `https://TEN_PROJECT.vercel.app` |
| `JWT_SECRET` | Chuỗi ngẫu nhiên bí mật, tối thiểu 32 ký tự |
| `DB_HOST` | Host MySQL cloud |
| `DB_PORT` | Port MySQL cloud (thường `3306`) |
| `DB_USER` | Username MySQL |
| `DB_PASSWORD` | Password MySQL |
| `DB_NAME` | Tên database |
| `DB_SSL` | `true` nếu nhà cung cấp yêu cầu TLS, nếu không thì `false` |
| `DB_SSL_REJECT_UNAUTHORIZED` | `true` |
| `DB_SSL_CA` | CA PEM nếu nhà cung cấp cấp CA riêng; nếu không thì để trống |
| `DB_CONNECTION_LIMIT` | `3` |
| `VITE_API_URL` | `/api` |
| `VITE_GOOGLE_CLIENT_ID` | Google Web Client ID; để trống nếu chưa cấu hình |
| `GOOGLE_CLIENT_ID` | Cùng giá trị với `VITE_GOOGLE_CLIENT_ID` |
| `VITE_APPLE_CLIENT_ID` | Apple Services ID; để trống nếu chưa cấu hình |
| `APPLE_CLIENT_ID` | Cùng giá trị với `VITE_APPLE_CLIENT_ID` |
| `VITE_APPLE_REDIRECT_URI` | Return URL HTTPS đã đăng ký trong Apple Developer |
| `APPLE_REDIRECT_URI` | Cùng giá trị với `VITE_APPLE_REDIRECT_URI` |

Các biến để bật email xác minh và cổng thanh toán lấy theo mục 4 và 5 ở trên: `SMTP_HOST`, `SMTP_PORT`, `SMTP_SECURE`, `SMTP_USER`, `SMTP_PASS`, `MAIL_FROM`, `EMAIL_VERIFICATION_REQUIRED`, `BANK_BIN`, `BANK_ACCOUNT_NO`, `BANK_ACCOUNT_NAME`, `BANK_NAME`, `BANK_TRANSFER_DEMO`, `MOMO_*`, `ZALOPAY_*`, `PAYPAL_*`. Chỉ nhập secret vào Vercel Environment Variables; tuyệt đối không đặt secret vào biến có tiền tố `VITE_`.

**Quan trọng:** thay `TEN_PROJECT` bằng đúng hostname Vercel được cấp. Khi gắn custom domain, cập nhật `CLIENT_URL` và `API_PUBLIC_URL` sang domain chính thức; thêm domain đó vào Google OAuth và Apple Developer. Các callback thanh toán phải trỏ tới `https://TEN_PROJECT.vercel.app/api/payments/momo/ipn` và `https://TEN_PROJECT.vercel.app/api/payments/zalopay/callback` (hoặc custom domain tương ứng).

### 9.5. Tạo tài khoản quản trị trong MySQL cloud

Sau khi database đã import schema và Vercel đã có biến DB, tạo `backend/.env` trên máy cá nhân (không commit file này), điền cùng thông tin DB cloud và các biến `SEED_ADMIN_EMAIL`, `SEED_ADMIN_PASSWORD`, sau đó chạy:

```bash
npm install
npm run seed:admin --workspace backend
```

Dùng email/mật khẩu do bạn tự đặt. Không dùng mật khẩu demo mặc định trên website công khai. Xóa file `backend/.env` khỏi máy chia sẻ hoặc lưu trữ an toàn sau khi seed xong.

### 9.6. Kiểm tra sau khi deploy

- Mở `https://TEN_PROJECT.vercel.app/` để kiểm tra giao diện.
- Mở `https://TEN_PROJECT.vercel.app/api/health`; phải trả JSON có `ok: true`.
- Thử refresh trực tiếp tại `/rooms`, `/login`, `/account` để xác nhận SPA fallback hoạt động.
- Thử đăng ký/đăng nhập và đặt phòng sau khi DB cloud đã kết nối.
- Xem Vercel → Deployments → Functions/Runtime Logs nếu API trả lỗi; kiểm tra biến môi trường và quyền kết nối MySQL.
- Google/Apple và cổng thanh toán chỉ hoạt động sau khi khai báo đúng Client ID/Services ID, domain, callback URL và credentials merchant thật.

### 9.7. Cập nhật source

Sau khi liên kết GitHub, mỗi lần push commit lên nhánh Production Branch, Vercel sẽ tạo deployment production mới; các nhánh/PR khác có thể tạo Preview Deployment. Sau khi thay đổi Environment Variables, cần redeploy để build mới nhận giá trị mới.

## 10. Lưu ý trước khi triển khai thật

- Đây là source ứng dụng hoàn chỉnh ở mức dự án học tập / MVP. Muốn nhận tiền thật cần tài khoản merchant đã được duyệt, HTTPS, domain callback công khai, secrets hợp lệ, chính sách hoàn tiền và kiểm thử end-to-end với từng cổng.
- QR chuyển khoản chỉ là yêu cầu thanh toán; ảnh QR không chứng minh tiền đã vào tài khoản. Cần đối soát sao kê hoặc tích hợp dịch vụ bank notification có xác thực.
- Không đưa API secret, App Password, file Apple `.p8` hay mật khẩu DB lên Git hoặc frontend.
- JWT hiện được lưu ở localStorage để đơn giản cho dự án; khi đưa vào production nên chuyển sang cookie HttpOnly/Secure/SameSite, thêm CSRF protection, MFA cho quản trị, audit log, backup và monitoring.
- Ảnh phòng đang dùng URL ảnh minh họa bên ngoài; có thể thay bằng ảnh khách sạn thực tế của bạn.
