# VNHotel Frontend

React + Vite frontend cho một khách sạn mô phỏng tại Đà Lạt.

Local development: chạy backend ở port 5000, sau đó:

```bash
copy .env.example .env
npm install
npm run dev
```

Vercel: root workspace build command `npm run build` tạo SPA vào thư mục `public/` ở project root. Express phục vụ API và React Router fallback trên cùng domain. Đặt `VITE_API_URL=/api` và `VITE_GOOGLE_CLIENT_ID` trong Vercel Environment Variables trước khi build. `VITE_GOOGLE_CLIENT_ID` phải dùng kiểu hiển thị Config (không phải Secret) và phải giống `GOOGLE_CLIENT_ID` phía backend; thêm origin production chính xác vào Authorized JavaScript origins trong Google Cloud Console rồi redeploy.

Trang danh sách/chi tiết/đặt phòng truyền ngày nhận và trả phòng để backend tính số phòng còn trống theo lịch thực tế. Backend vẫn kiểm tra lại tồn phòng trong transaction khi tạo đơn.
