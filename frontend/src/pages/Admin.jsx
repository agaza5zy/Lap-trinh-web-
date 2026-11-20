import { useCallback, useEffect, useState } from 'react';
import apiClient from '../api/client';
import { money, dateLabel } from '../data/rooms';
import { useAuth } from '../context/AuthContext';

const bookingStatus = { pending: 'Chờ xác nhận', confirmed: 'Đã xác nhận', checked_in: 'Đang lưu trú', checked_out: 'Đã trả phòng', cancelled: 'Đã hủy' };
const roomStatus = { available: 'Đang mở bán', cleaning: 'Đang dọn', maintenance: 'Bảo trì', inactive: 'Ngừng khai thác' };
const roleLabel = { admin: 'Quản trị viên', staff: 'Lễ tân', customer: 'Khách hàng' };
const paymentLabel = (booking) => booking.paymentStatus === 'paid' ? 'Đã thanh toán' : booking.paymentStatus === 'failed' ? 'Thất bại' : booking.paymentProvider === 'cash' ? 'Chờ thu tiền tại quầy' : booking.paymentProvider === 'bank_transfer' ? 'Chờ đối soát' : booking.paymentStatus === 'pending' ? 'Đang chờ xử lý' : 'Chưa thanh toán';

export default function Admin() {
  const { user } = useAuth();
  const [view, setView] = useState('dashboard');
  const [stats, setStats] = useState(null);
  const [bookings, setBookings] = useState([]);
  const [rooms, setRooms] = useState([]);
  const [hotels, setHotels] = useState([]);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [showRoomForm, setShowRoomForm] = useState(false);
  const [showUnitForm, setShowUnitForm] = useState(false);
  const [unitForm, setUnitForm] = useState({ roomTypeId: '', roomNumber: '', floor: '2' });
  const [roomForm, setRoomForm] = useState({ name: '', price: '', maxGuests: '2', area: '30', roomNumber: '', floor: '2', bedType: 'Giường đôi', image: '', description: '' });

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const [statData, bookingData, roomData, hotelData, userData] = await Promise.all([
        apiClient.get('/admin/stats'),
        apiClient.get('/admin/bookings'),
        apiClient.get('/admin/rooms'),
        apiClient.get('/admin/hotels'),
        user?.role === 'admin' ? apiClient.get('/admin/users') : Promise.resolve({ data: { users: [] } }),
      ]);
      setStats(statData.data.stats);
      setBookings(bookingData.data.bookings);
      setRooms(roomData.data.rooms);
      setHotels(hotelData.data.hotels);
      setUsers(userData.data.users);
    } catch (err) {
      setError(err.response?.data?.message || 'Không thể tải dữ liệu quản lý khách sạn.');
    } finally {
      setLoading(false);
    }
  }, [user?.role]);
  useEffect(() => { load(); }, [load]);

  async function updateBooking(id, status) {
    setNotice(''); setError('');
    try {
      await apiClient.patch(`/admin/bookings/${id}/status`, { status });
      setNotice('Đã cập nhật trạng thái lưu trú.');
      await load();
    } catch (err) { setError(err.response?.data?.message || 'Không cập nhật được đơn.'); }
  }

  async function updateRoom(id, status) {
    try {
      await apiClient.patch(`/admin/rooms/${id}`, { status });
      setNotice('Đã cập nhật trạng thái phòng.');
      await load();
    } catch (err) { setError(err.response?.data?.message || 'Không cập nhật được phòng.'); }
  }

  async function confirmBank(paymentId) {
    const transactionCode = window.prompt('Nhập mã giao dịch ngân hàng (nếu có):') || '';
    try {
      await apiClient.patch(`/payments/${paymentId}/confirm-bank`, { transactionCode });
      setNotice('Đã đối soát và xác nhận chuyển khoản.');
      await load();
    } catch (err) { setError(err.response?.data?.message || 'Không xác nhận được giao dịch.'); }
  }

  async function confirmCash(paymentId) {
    if (!window.confirm('Xác nhận khách đã thanh toán tiền mặt tại quầy lễ tân?')) return;
    try {
      await apiClient.patch(`/payments/${paymentId}/confirm-cash`, {});
      setNotice('Đã xác nhận thu tiền tại quầy. Đơn đặt phòng đã được xác nhận.');
      await load();
    } catch (err) { setError(err.response?.data?.message || 'Không xác nhận được khoản thu tiền mặt.'); }
  }

  async function updateUserStatus(id, status) {
    try {
      await apiClient.patch(`/admin/users/${id}/status`, { status });
      setNotice('Đã cập nhật trạng thái tài khoản.');
      await load();
    } catch (err) { setError(err.response?.data?.message || 'Không cập nhật được tài khoản.'); }
  }

  async function updateUserRole(id, role) {
    try {
      await apiClient.patch(`/admin/users/${id}/role`, { role });
      setNotice(role === 'staff' ? 'Đã phân quyền tài khoản thành lễ tân VNHotel Đà Lạt.' : 'Đã chuyển tài khoản về vai trò khách hàng.');
      await load();
    } catch (err) { setError(err.response?.data?.message || 'Không cập nhật được vai trò.'); }
  }

  async function addRoom(event) {
    event.preventDefault(); setError(''); setNotice('');
    try {
      await apiClient.post('/admin/rooms', {
        ...roomForm,
        price: Number(roomForm.price),
        maxGuests: Number(roomForm.maxGuests),
        area: Number(roomForm.area),
        floor: Number(roomForm.floor),
      });
      setShowRoomForm(false);
      setRoomForm({ name: '', price: '', maxGuests: '2', area: '30', roomNumber: '', floor: '2', bedType: 'Giường đôi', image: '', description: '' });
      setNotice('Đã tạo loại phòng và phòng vật lý đầu tiên tại VNHotel Đà Lạt.');
      await load();
    } catch (err) { setError(err.response?.data?.message || 'Không thể tạo phòng.'); }
  }

  async function addRoomUnit(event) {
    event.preventDefault(); setError(''); setNotice('');
    try {
      await apiClient.post(`/admin/room-types/${unitForm.roomTypeId}/rooms`, { roomNumber: unitForm.roomNumber, floor: unitForm.floor });
      setShowUnitForm(false);
      setUnitForm({ roomTypeId: '', roomNumber: '', floor: '2' });
      setNotice('Đã thêm phòng vật lý vào hạng phòng hiện có.');
      await load();
    } catch (err) { setError(err.response?.data?.message || 'Không thể thêm phòng vật lý.'); }
  }

  const nav = [
    { id: 'dashboard', icon: '▦', label: 'Tổng quan' },
    { id: 'bookings', icon: '▣', label: 'Đơn đặt phòng' },
    { id: 'rooms', icon: '▤', label: 'Quản lý phòng' },
    { id: 'hotel', icon: '⌂', label: 'Thông tin khách sạn' },
    ...(user?.role === 'admin' ? [{ id: 'users', icon: '♙', label: 'Tài khoản & lễ tân' }] : []),
  ];

  return <div className="admin-shell">
    <aside className="admin-sidebar">
      <div className="admin-logo">✦ VNHotel <small>ĐÀ LẠT · QUẢN LÝ KHÁCH SẠN</small></div>
      <span className="sidebar-label">VẬN HÀNH KHÁCH SẠN</span>
      {nav.map((item) => <button key={item.id} className={view === item.id ? 'selected' : ''} onClick={() => setView(item.id)}><span>{item.icon}</span>{item.label}</button>)}
      <div className="sidebar-bottom"><div className="sidebar-user"><div>{user?.fullName?.charAt(0) || 'V'}</div><span><strong>{user?.fullName}</strong><small>{roleLabel[user?.role] || 'Nhân viên'}</small></span></div><a href="/">← Về website</a></div>
    </aside>
    <main className="admin-main">
      <div className="admin-top"><div><span className="eyebrow dark">VNHOTEL ĐÀ LẠT</span><h1>{nav.find((item) => item.id === view)?.label || 'Tổng quan'}</h1><p className="section-lead">Quản lý hoạt động của một khách sạn tại Đà Lạt.</p></div><button className="btn btn-outline" onClick={load}>↻ Làm mới dữ liệu</button></div>
      {error && <div className="alert alert-error">{error}</div>}{notice && <div className="alert alert-success">{notice}</div>}{loading && <div className="page-loader">Đang tải dữ liệu quản lý…</div>}

      {!loading && view === 'dashboard' && <>
        <div className="admin-stat-grid">
          <div className="admin-stat"><span>Tổng đơn đặt phòng</span><strong>{stats?.totalBookings ?? 0}</strong><small>Không tính đơn đã hủy</small></div>
          <div className="admin-stat"><span>Đơn chờ lễ tân xử lý</span><strong>{stats?.pendingBookings ?? 0}</strong><small>Chờ thanh toán hoặc đối soát</small></div>
          <div className="admin-stat"><span>Phòng đang mở bán</span><strong>{stats?.availableRooms ?? 0}</strong><small>Tại VNHotel Đà Lạt</small></div>
          <div className="admin-stat"><span>Doanh thu đã thu</span><strong>{money(stats?.revenue || 0)}</strong><small>Chỉ tính giao dịch đã thanh toán</small></div>
        </div>
        <section className="admin-card"><div className="admin-card-heading"><div><h2>Đơn đặt phòng gần đây</h2><p>Lễ tân kiểm tra thanh toán và cập nhật tình trạng lưu trú.</p></div><button className="text-button" onClick={() => setView('bookings')}>Xem tất cả ↗</button></div><BookingTable bookings={bookings.slice(0, 6)} onUpdate={updateBooking} onConfirmBank={confirmBank} onConfirmCash={confirmCash} /></section>
      </>}

      {!loading && view === 'bookings' && <section className="admin-card"><div className="admin-card-heading"><div><h2>Quản lý đơn đặt phòng</h2><p>Đối soát thanh toán, xác nhận đơn, nhận phòng và trả phòng.</p></div><span className="count-chip">{bookings.length} đơn</span></div><BookingTable bookings={bookings} onUpdate={updateBooking} onConfirmBank={confirmBank} onConfirmCash={confirmCash} /></section>}

      {!loading && view === 'hotel' && <section className="admin-card"><div className="admin-card-heading"><div><h2>Thông tin VNHotel Đà Lạt</h2><p>Đồ án hiện mô phỏng một khách sạn duy nhất.</p></div></div>
        {hotels.length ? hotels.map((hotel) => <div className="hotel-profile" key={hotel.id}>
          {hotel.image && <img src={hotel.image} alt={hotel.name} />}
          <div><span className="status-pill status-available">{hotel.status === 'active' ? 'Đang hoạt động' : 'Đang tạm ẩn'}</span><h3>{hotel.name}</h3><p>{hotel.address}</p><p>{hotel.city} · {hotel.stars || 0} ★</p><p>{hotel.description || 'Khách sạn nghỉ dưỡng tại Đà Lạt.'}</p><strong>{hotel.totalRooms} phòng vật lý</strong></div>
        </div>) : <div className="alert alert-error">Chưa tìm thấy khách sạn có thành phố “Đà Lạt” trong TiDB. Hãy kiểm tra và chạy migration single-hotel trong thư mục database/migrations.</div>}
      </section>}

      {!loading && view === 'rooms' && <section className="admin-card"><div className="admin-card-heading"><div><h2>Danh sách phòng vật lý</h2><p>Quản lý số phòng, tầng và tình trạng khai thác.</p></div>{user?.role === 'admin' && <div className="table-actions"><button className="btn btn-small" onClick={() => { setShowRoomForm(!showRoomForm); setShowUnitForm(false); }}>{showRoomForm ? 'Đóng tạo loại phòng' : '+ Thêm loại phòng'}</button><button className="btn btn-outline btn-small" onClick={() => { setShowUnitForm(!showUnitForm); setShowRoomForm(false); }}>{showUnitForm ? 'Đóng thêm phòng' : '+ Thêm phòng vật lý'}</button></div>}</div>
        {showRoomForm && <form className="admin-room-form" onSubmit={addRoom}><div className="form-hint span-2">Loại phòng và số phòng mới sẽ được tạo tại VNHotel Đà Lạt.</div><label>Tên loại phòng<input required value={roomForm.name} onChange={(e) => setRoomForm({ ...roomForm, name: e.target.value })} /></label><label>Giá / đêm (VND)<input required type="number" min="1" value={roomForm.price} onChange={(e) => setRoomForm({ ...roomForm, price: e.target.value })} /></label><label>Sức chứa<input required type="number" min="1" max="12" value={roomForm.maxGuests} onChange={(e) => setRoomForm({ ...roomForm, maxGuests: e.target.value })} /></label><label>Diện tích (m²)<input type="number" min="1" value={roomForm.area} onChange={(e) => setRoomForm({ ...roomForm, area: e.target.value })} /></label><label>Số phòng đầu tiên<input required value={roomForm.roomNumber} onChange={(e) => setRoomForm({ ...roomForm, roomNumber: e.target.value })} placeholder="501" /></label><label>Tầng<input type="number" value={roomForm.floor} onChange={(e) => setRoomForm({ ...roomForm, floor: e.target.value })} /></label><label>Loại giường<input value={roomForm.bedType} onChange={(e) => setRoomForm({ ...roomForm, bedType: e.target.value })} /></label><label className="span-2">Ảnh đại diện (URL)<input value={roomForm.image} onChange={(e) => setRoomForm({ ...roomForm, image: e.target.value })} placeholder="https://…" /></label><label className="span-2">Mô tả<textarea rows="2" value={roomForm.description} onChange={(e) => setRoomForm({ ...roomForm, description: e.target.value })} /></label><button className="btn" type="submit">Lưu loại phòng & số phòng</button></form>}
        {showUnitForm && <form className="admin-room-form" onSubmit={addRoomUnit}><div className="form-hint">Thêm một phòng vật lý vào hạng phòng đã có; số lượng phòng còn trống sẽ được cập nhật theo dữ liệu này.</div><label className="span-2">Hạng phòng<select required value={unitForm.roomTypeId} onChange={(e) => setUnitForm({ ...unitForm, roomTypeId: e.target.value })}><option value="">Chọn hạng phòng</option>{[...new Map(rooms.map((room) => [room.roomTypeId, room])).values()].map((room) => <option key={room.roomTypeId} value={room.roomTypeId}>{room.name}</option>)}</select></label><label>Số phòng mới<input required value={unitForm.roomNumber} onChange={(e) => setUnitForm({ ...unitForm, roomNumber: e.target.value })} placeholder="203" /></label><label>Tầng<input type="number" value={unitForm.floor} onChange={(e) => setUnitForm({ ...unitForm, floor: e.target.value })} /></label><button className="btn" type="submit" disabled={!rooms.length}>Thêm phòng vào hạng đã chọn</button></form>}
        <div className="table-scroll"><table><thead><tr><th>Mã phòng</th><th>Số phòng</th><th>Loại phòng</th><th>Giá / đêm</th><th>Trạng thái</th><th>Thao tác</th></tr></thead><tbody>{rooms.map((room) => <tr key={room.id}><td>R{String(room.id).padStart(3, '0')}</td><td>{room.roomNumber} · Tầng {room.floor || '—'}</td><td>{room.name}</td><td>{money(room.price)}</td><td><span className={`status-pill status-${room.roomStatus}`}>{roomStatus[room.roomStatus] || room.roomStatus}</span></td><td><select className="table-select" value={room.roomStatus} onChange={(event) => updateRoom(room.id, event.target.value)}><option value="available">Đang mở bán</option><option value="cleaning">Đang dọn</option><option value="maintenance">Bảo trì</option><option value="inactive">Ngừng khai thác</option></select></td></tr>)}</tbody></table>{!rooms.length && <div className="table-empty">Chưa có phòng. Quản trị viên có thể thêm loại phòng và số phòng.</div>}</div>
      </section>}

      {!loading && view === 'users' && user?.role === 'admin' && <section className="admin-card"><div className="admin-card-heading"><div><h2>Tài khoản & phân quyền lễ tân</h2><p>Đăng ký tài khoản bình thường trước, sau đó quản trị viên chuyển tài khoản cần thiết thành lễ tân.</p></div><span className="count-chip">{users.length} tài khoản</span></div><div className="table-scroll"><table><thead><tr><th>Tài khoản</th><th>Email</th><th>Đăng nhập</th><th>Xác minh</th><th>Vai trò</th><th>Trạng thái</th><th>Thao tác</th></tr></thead><tbody>{users.map((item) => <tr key={item.id}><td>{item.fullName}</td><td>{item.email}</td><td>{item.authProvider || 'local'}</td><td>{item.emailVerified ? 'Đã xác minh' : 'Chưa xác minh'}</td><td>{item.role === 'admin' ? roleLabel.admin : <select className="table-select" value={item.role} disabled={Number(item.id) === Number(user?.id)} onChange={(event) => updateUserRole(item.id, event.target.value)}><option value="customer">Khách hàng</option><option value="staff">Lễ tân</option></select>}</td><td>{item.status === 'active' ? 'Hoạt động' : 'Đã khóa'}</td><td>{item.role !== 'admin' && <button className="table-btn" onClick={() => updateUserStatus(item.id, item.status === 'active' ? 'locked' : 'active')}>{item.status === 'active' ? 'Khóa' : 'Mở khóa'}</button>}</td></tr>)}</tbody></table></div></section>}
    </main>
  </div>;
}

function BookingTable({ bookings, onUpdate, onConfirmBank, onConfirmCash }) {
  return <div className="table-scroll"><table><thead><tr><th>Mã đơn</th><th>Khách hàng</th><th>Hạng phòng</th><th>Thời gian</th><th>Tổng tiền</th><th>Thanh toán</th><th>Trạng thái đơn</th><th>Thao tác lễ tân</th></tr></thead><tbody>{bookings.map((booking) => {
    const actions = booking.status === 'pending' ? ['pending', 'cancelled']
      : booking.status === 'confirmed' ? ['confirmed', 'checked_in']
        : booking.status === 'checked_in' ? ['checked_in', 'checked_out']
          : [booking.status];
    return <tr key={booking.id}>
      <td><strong>{booking.code}</strong></td>
      <td>{booking.guestName}<small className="table-sub">{booking.guestEmail}</small><small className="table-sub">{booking.guestPhone}</small></td>
      <td>{booking.roomName}</td>
      <td>{dateLabel(booking.checkIn)}<small className="table-sub">đến {dateLabel(booking.checkOut)}</small></td>
      <td>{money(booking.totalAmount)}</td>
      <td><span className={`status-pill status-${booking.paymentStatus || 'pending'}`}>{paymentLabel(booking)}</span><small className="table-sub">{booking.paymentProvider || 'Chưa chọn'}</small></td>
      <td>{bookingStatus[booking.status] || booking.status}</td>
      <td><div className="table-actions">
        {booking.paymentProvider === 'bank_transfer' && booking.paymentStatus === 'pending' && <button className="table-btn" onClick={() => onConfirmBank(booking.paymentId)}>Đối soát</button>}
        {booking.paymentProvider === 'cash' && booking.paymentStatus === 'pending' && <button className="table-btn" onClick={() => onConfirmCash(booking.paymentId)}>Xác nhận đã thu</button>}
        <select className="table-select" value={booking.status} onChange={(event) => onUpdate(booking.id, event.target.value)} aria-label={`Cập nhật đơn ${booking.code}`}>
          {actions.map((status) => <option key={status} value={status}>{status === 'pending' ? 'Chờ xác nhận' : status === 'confirmed' ? 'Đã xác nhận' : status === 'checked_in' ? 'Nhận phòng' : status === 'checked_out' ? 'Trả phòng' : 'Hủy đơn'}</option>)}
        </select>
      </div></td>
    </tr>;
  })}</tbody></table>{!bookings.length && <div className="table-empty">Chưa có đơn đặt phòng.</div>}</div>;
}
