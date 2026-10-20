import { useState } from 'react';
import { Link } from 'react-router-dom';
import { rooms as sampleRooms, money } from '../data/rooms';

const startingBookings = [
  {
    id: 'BK001',
    name: 'Nguyễn Văn An',
    room: 'Deluxe Hướng Biển',
    checkIn: '2026-11-03',
    checkOut: '2026-11-05',
    status: 'Chờ xác nhận'
  },
  {
    id: 'BK002',
    name: 'Trần Minh Anh',
    room: 'Suite Sang Trọng',
    checkIn: '2026-11-07',
    checkOut: '2026-11-09',
    status: 'Đã xác nhận'
  },
  {
    id: 'BK003',
    name: 'Lê Thanh Bình',
    room: 'Phòng Gia Đình',
    checkIn: '2026-11-12',
    checkOut: '2026-11-14',
    status: 'Đã xác nhận'
  }
];

export default function Admin() {
  const [bookings, setBookings] = useState(startingBookings);
  const [rooms, setRooms] = useState(sampleRooms);
  const [view, setView] = useState('dashboard');

  function confirm(id) {
    setBookings((prev) =>
      prev.map((b) => (b.id === id ? { ...b, status: 'Đã xác nhận' } : b))
    );
  }

  function toggleRoom(id) {
    setRooms((prev) =>
      prev.map((r) =>
        r.id === id
          ? { ...r, status: r.status === 'Còn phòng' ? 'Tạm khóa' : 'Còn phòng' }
          : r
      )
    );
  }

  function addRoom() {
    const name = window.prompt('Nhập tên phòng mới:');
    if (!name?.trim()) return;

    setRooms((prev) => [
      ...prev,
      {
        ...sampleRooms[0],
        id: Math.max(...prev.map((r) => r.id)) + 1,
        name: name.trim(),
        type: 'Standard',
        price: 800000,
        status: 'Còn phòng'
      }
    ]);
  }

  return (
    <div className="admin-shell">
      {/* Sidebar Navigation */}
      <aside className="admin-sidebar">
        <h2>
          ✦ VNHotel <small>Admin</small>
        </h2>
        <button
          className={view === 'dashboard' ? 'selected' : ''}
          onClick={() => setView('dashboard')}
        >
          ▦ Bảng điều khiển
        </button>
        <button
          className={view === 'rooms' ? 'selected' : ''}
          onClick={() => setView('rooms')}
        >
          ▤ Quản lý phòng
        </button>
        <button
          className={view === 'bookings' ? 'selected' : ''}
          onClick={() => setView('bookings')}
        >
          ▣ Quản lý đặt phòng
        </button>
        <Link to="/">← Về trang web</Link>
      </aside>

      {/* Main Content */}
      <main className="admin-main">
        {/* Top Bar */}
        <div className="admin-top">
          <div>
            <p className="eyebrow dark">QUẢN TRỊ HỆ THỐNG</p>
            <h1>
              {view === 'rooms'
                ? 'Quản lý phòng'
                : view === 'bookings'
                ? 'Quản lý đặt phòng'
                : 'Bảng điều khiển'}
            </h1>
          </div>
          <span>Xin chào, Admin 👋</span>
        </div>

        <p className="demo-banner">
          Dữ liệu minh họa chỉ lưu trong bộ nhớ trình duyệt khi trang đang mở; chưa kết nối cơ sở dữ liệu.
        </p>

        {/* Thống kê (Dashboard View) */}
        {view === 'dashboard' && (
          <div className="stat-grid">
            <div className="stat">
              <span>Đơn đặt phòng mẫu</span>
              <strong>{bookings.length}</strong>
            </div>
            <div className="stat">
              <span>Phòng còn mở bán</span>
              <strong>
                {rooms.filter((r) => r.status === 'Còn phòng').length}
              </strong>
            </div>
            <div className="stat">
              <span>Doanh thu thực tế</span>
              <strong>Chưa kết nối</strong>
            </div>
          </div>
        )}

        {/* Danh sách Đặt phòng */}
        {(view === 'dashboard' || view === 'bookings') && (
          <section className="admin-card">
            <h2>Đơn đặt phòng gần đây</h2>
            <div className="table-scroll">
              <table>
                <thead>
                  <tr>
                    <th>Mã đơn</th>
                    <th>Khách hàng</th>
                    <th>Phòng</th>
                    <th>Nhận phòng</th>
                    <th>Trả phòng</th>
                    <th>Trạng thái</th>
                    <th>Hành động</th>
                  </tr>
                </thead>
                <tbody>
                  {bookings.map((b) => (
                    <tr key={b.id}>
                      <td>{b.id}</td>
                      <td>{b.name}</td>
                      <td>{b.room}</td>
                      <td>{b.checkIn}</td>
                      <td>{b.checkOut}</td>
                      <td>
                        <span className="status">{b.status}</span>
                      </td>
                      <td>
                        <button
                          className="table-btn"
                          disabled={b.status === 'Đã xác nhận'}
                          onClick={() => confirm(b.id)}
                        >
                          Xác nhận
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        )}

        {/* Danh sách Phòng */}
        {(view === 'dashboard' || view === 'rooms') && (
          <section className="admin-card">
            <div className="admin-card-heading">
              <h2>Danh sách phòng</h2>
              <button className="btn btn-small" onClick={addRoom}>
                + Thêm phòng mới
              </button>
            </div>
            <div className="table-scroll">
              <table>
                <thead>
                  <tr>
                    <th>Mã phòng</th>
                    <th>Tên phòng</th>
                    <th>Loại</th>
                    <th>Giá (VND)</th>
                    <th>Trạng thái</th>
                    <th>Hành động</th>
                  </tr>
                </thead>
                <tbody>
                  {rooms.map((r) => (
                    <tr key={r.id}>
                      <td>R{String(r.id).padStart(3, '0')}</td>
                      <td>{r.name}</td>
                      <td>{r.type}</td>
                      <td>{money(r.price)}</td>
                      <td>
                        <span className="status">{r.status}</span>
                      </td>
                      <td>
                        <button
                          className="table-btn"
                          onClick={() => toggleRoom(r.id)}
                        >
                          {r.status === 'Còn phòng' ? 'Tạm khóa' : 'Mở bán'}
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        )}
      </main>
    </div>
  );
}