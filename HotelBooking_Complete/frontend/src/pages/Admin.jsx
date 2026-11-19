import { useCallback, useEffect, useState } from 'react';
import apiClient from '../api/client';
import { money, dateLabel } from '../data/rooms';
import { useAuth } from '../context/AuthContext';

const bookingStatus = { pending: 'Chờ thanh toán', confirmed: 'Đã xác nhận', checked_in: 'Đang lưu trú', checked_out: 'Đã trả phòng', cancelled: 'Đã hủy' };
const roomStatus = { available: 'Đang mở bán', cleaning: 'Đang dọn', maintenance: 'Bảo trì', inactive: 'Ngừng khai thác' };

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
  const [showHotelForm, setShowHotelForm] = useState(false);
  const [hotelForm, setHotelForm] = useState({ name: '', address: '', city: '', stars: '4', image: '', description: '' });
  const [roomForm, setRoomForm] = useState({ hotelId: '1', name: '', price: '', maxGuests: '2', area: '30', roomNumber: '', floor: '2', bedType: 'Giường đôi', image: '', description: '' });

  const load = useCallback(async () => {
    setLoading(true); setError('');
    try {
      const [statData, bookingData, roomData, hotelData, userData] = await Promise.all([
        apiClient.get('/admin/stats'), apiClient.get('/admin/bookings'), apiClient.get('/admin/rooms'), apiClient.get('/admin/hotels'),
        user?.role === 'admin' ? apiClient.get('/admin/users') : Promise.resolve({ data: { users: [] } }),
      ]);
      setStats(statData.data.stats); setBookings(bookingData.data.bookings); setRooms(roomData.data.rooms); setHotels(hotelData.data.hotels); setUsers(userData.data.users);
    } catch (err) { setError(err.response?.data?.message || 'Không thể tải dữ liệu quản trị.'); }
    finally { setLoading(false); }
  }, [user?.role]);
  useEffect(() => { load(); }, [load]);

  async function updateBooking(id, status) {
    setNotice(''); setError('');
    try { await apiClient.patch(`/admin/bookings/${id}/status`, { status }); setNotice('Đã cập nhật trạng thái đơn.'); await load(); }
    catch (err) { setError(err.response?.data?.message || 'Không cập nhật được đơn.'); }
  }
  async function updateRoom(id, status) {
    try { await apiClient.patch(`/admin/rooms/${id}`, { status }); setNotice('Đã cập nhật trạng thái phòng.'); await load(); }
    catch (err) { setError(err.response?.data?.message || 'Không cập nhật được phòng.'); }
  }
  async function confirmBank(paymentId) {
    const transactionCode = window.prompt('Nhập mã giao dịch ngân hàng (nếu có):') || '';
    try { await apiClient.patch(`/payments/${paymentId}/confirm-bank`, { transactionCode }); setNotice('Đã xác nhận chuyển khoản.'); await load(); }
    catch (err) { setError(err.response?.data?.message || 'Không xác nhận được giao dịch.'); }
  }
  async function updateUser(id, status) {
    try { await apiClient.patch(`/admin/users/${id}/status`, { status }); setNotice('Đã cập nhật tài khoản.'); await load(); }
    catch (err) { setError(err.response?.data?.message || 'Không cập nhật được tài khoản.'); }
  }
  async function addHotel(event) {
    event.preventDefault(); setError(''); setNotice('');
    try { await apiClient.post('/admin/hotels', { ...hotelForm, stars: Number(hotelForm.stars) }); setShowHotelForm(false); setHotelForm({ name: '', address: '', city: '', stars: '4', image: '', description: '' }); setNotice('Đã tạo khách sạn mới.'); await load(); }
    catch (err) { setError(err.response?.data?.message || 'Không thể tạo khách sạn.'); }
  }
  async function updateHotel(id, status) {
    try { await apiClient.patch(`/admin/hotels/${id}`, { status }); setNotice('Đã cập nhật trạng thái khách sạn.'); await load(); }
    catch (err) { setError(err.response?.data?.message || 'Không cập nhật được khách sạn.'); }
  }

  async function addRoom(event) {
    event.preventDefault(); setError(''); setNotice('');
    try { await apiClient.post('/admin/rooms', { ...roomForm, hotelId: Number(roomForm.hotelId), price: Number(roomForm.price), maxGuests: Number(roomForm.maxGuests), area: Number(roomForm.area), floor: Number(roomForm.floor) }); setShowRoomForm(false); setRoomForm({ hotelId: '1', name: '', price: '', maxGuests: '2', area: '30', roomNumber: '', floor: '2', bedType: 'Giường đôi', image: '', description: '' }); setNotice('Đã tạo loại phòng và phòng đầu tiên.'); await load(); }
    catch (err) { setError(err.response?.data?.message || 'Không thể tạo phòng.'); }
  }

  const nav = [{ id: 'dashboard', icon: '▦', label: 'Tổng quan' }, { id: 'bookings', icon: '▣', label: 'Đặt phòng' }, { id: 'hotels', icon: '⌂', label: 'Khách sạn' }, { id: 'rooms', icon: '▤', label: 'Phòng khách sạn' }, ...(user?.role === 'admin' ? [{ id: 'users', icon: '♙', label: 'Khách hàng' }] : [])];
  return <div className="admin-shell"><aside className="admin-sidebar"><div className="admin-logo">✦ VNHotel <small>CONTROL CENTER</small></div><span className="sidebar-label">WORKSPACE</span>{nav.map((item) => <button key={item.id} className={view === item.id ? 'selected' : ''} onClick={() => setView(item.id)}><span>{item.icon}</span>{item.label}</button>)}<div className="sidebar-bottom"><div className="sidebar-user"><div>{user?.fullName?.charAt(0) || 'A'}</div><span><strong>{user?.fullName}</strong><small>{user?.role === 'admin' ? 'Quản trị viên' : 'Nhân viên'}</small></span></div><a href="/">← Về website</a></div></aside>
    <main className="admin-main"><div className="admin-top"><div><span className="eyebrow dark">QUẢN TRỊ HỆ THỐNG</span><h1>{nav.find((x) => x.id === view)?.label || 'Tổng quan'}</h1><p className="section-lead">Theo dõi và vận hành hoạt động VNHotel.</p></div><button className="btn btn-outline" onClick={load}>↻ Làm mới dữ liệu</button></div>
      {error && <div className="alert alert-error">{error}</div>}{notice && <div className="alert alert-success">{notice}</div>}{loading && <div className="page-loader">Đang tải dữ liệu quản trị…</div>}
      {!loading && view === 'dashboard' && <>
        <div className="admin-stat-grid"><div className="admin-stat"><span>Tổng đơn đặt phòng</span><strong>{stats?.totalBookings ?? 0}</strong><small>Không tính đơn đã hủy</small></div><div className="admin-stat"><span>Đơn chờ thanh toán</span><strong>{stats?.pendingBookings ?? 0}</strong><small>Cần theo dõi và đối soát</small></div><div className="admin-stat"><span>Phòng đang mở bán</span><strong>{stats?.availableRooms ?? 0}</strong><small>Trên toàn hệ thống</small></div><div className="admin-stat"><span>Doanh thu đã thu</span><strong>{money(stats?.revenue || 0)}</strong><small>Chỉ tính giao dịch đã thanh toán</small></div></div>
        <section className="admin-card"><div className="admin-card-heading"><div><h2>Đơn đặt phòng gần đây</h2><p>Những đơn mới nhất trong hệ thống.</p></div><button className="text-button" onClick={() => setView('bookings')}>Xem tất cả ↗</button></div><BookingTable bookings={bookings.slice(0, 6)} onUpdate={updateBooking} onConfirmBank={confirmBank} /></section>
      </>}
      {!loading && view === 'bookings' && <section className="admin-card"><div className="admin-card-heading"><div><h2>Quản lý đơn đặt phòng</h2><p>Cập nhật trạng thái lưu trú và kiểm tra thanh toán.</p></div><span className="count-chip">{bookings.length} đơn</span></div><BookingTable bookings={bookings} onUpdate={updateBooking} onConfirmBank={confirmBank} /></section>}
      {!loading && view === 'hotels' && <section className="admin-card"><div className="admin-card-heading"><div><h2>Quản lý khách sạn</h2><p>Thêm khách sạn và bật / tắt hiển thị trên website.</p></div>{user?.role === 'admin' && <button className="btn btn-small" onClick={() => setShowHotelForm(!showHotelForm)}>{showHotelForm ? 'Đóng biểu mẫu' : '+ Thêm khách sạn'}</button>}</div>
        {showHotelForm && <form className="admin-room-form" onSubmit={addHotel}><label>Tên khách sạn<input required value={hotelForm.name} onChange={(e) => setHotelForm({ ...hotelForm, name: e.target.value })} /></label><label>Thành phố<input required value={hotelForm.city} onChange={(e) => setHotelForm({ ...hotelForm, city: e.target.value })} /></label><label>Hạng sao<select value={hotelForm.stars} onChange={(e) => setHotelForm({ ...hotelForm, stars: e.target.value })}><option value="3">3 sao</option><option value="4">4 sao</option><option value="5">5 sao</option></select></label><label className="span-2">Địa chỉ<input required value={hotelForm.address} onChange={(e) => setHotelForm({ ...hotelForm, address: e.target.value })} /></label><label>Ảnh đại diện (URL)<input value={hotelForm.image} onChange={(e) => setHotelForm({ ...hotelForm, image: e.target.value })} placeholder="https://…" /></label><label className="span-2">Mô tả<textarea rows="2" value={hotelForm.description} onChange={(e) => setHotelForm({ ...hotelForm, description: e.target.value })} /></label><button className="btn" type="submit">Lưu khách sạn</button></form>}
        <div className="table-scroll"><table><thead><tr><th>Khách sạn</th><th>Thành phố</th><th>Địa chỉ</th><th>Hạng sao</th><th>Số phòng</th><th>Trạng thái</th><th>Thao tác</th></tr></thead><tbody>{hotels.map((hotel) => <tr key={hotel.id}><td><strong>{hotel.name}</strong></td><td>{hotel.city}</td><td>{hotel.address}</td><td>{hotel.stars || '—'} ★</td><td>{hotel.totalRooms}</td><td>{hotel.status === 'active' ? 'Đang hiển thị' : 'Đã ẩn'}</td><td>{user?.role === 'admin' && <button className="table-btn" onClick={() => updateHotel(hotel.id, hotel.status === 'active' ? 'inactive' : 'active')}>{hotel.status === 'active' ? 'Ẩn' : 'Hiển thị'}</button>}</td></tr>)}</tbody></table></div>
      </section>}
      {!loading && view === 'rooms' && <section className="admin-card"><div className="admin-card-heading"><div><h2>Danh sách phòng vật lý</h2><p>Quản lý số phòng, tầng và trạng thái khai thác.</p></div>{user?.role === 'admin' && <button className="btn btn-small" onClick={() => setShowRoomForm(!showRoomForm)}>{showRoomForm ? 'Đóng biểu mẫu' : '+ Thêm loại phòng'}</button>}</div>
        {showRoomForm && <form className="admin-room-form" onSubmit={addRoom}><label>Khách sạn<select value={roomForm.hotelId} onChange={(e) => setRoomForm({ ...roomForm, hotelId: e.target.value })}>{hotels.filter((hotel) => hotel.status === 'active').map((hotel) => <option key={hotel.id} value={hotel.id}>{hotel.name}</option>)}</select></label><label>Tên loại phòng<input required value={roomForm.name} onChange={(e) => setRoomForm({ ...roomForm, name: e.target.value })} /></label><label>Giá / đêm<input required type="number" min="0" value={roomForm.price} onChange={(e) => setRoomForm({ ...roomForm, price: e.target.value })} /></label><label>Sức chứa<input required type="number" min="1" max="12" value={roomForm.maxGuests} onChange={(e) => setRoomForm({ ...roomForm, maxGuests: e.target.value })} /></label><label>Diện tích (m²)<input type="number" min="1" value={roomForm.area} onChange={(e) => setRoomForm({ ...roomForm, area: e.target.value })} /></label><label>Số phòng đầu tiên<input required value={roomForm.roomNumber} onChange={(e) => setRoomForm({ ...roomForm, roomNumber: e.target.value })} placeholder="501" /></label><label>Tầng<input type="number" value={roomForm.floor} onChange={(e) => setRoomForm({ ...roomForm, floor: e.target.value })} /></label><label>Loại giường<input value={roomForm.bedType} onChange={(e) => setRoomForm({ ...roomForm, bedType: e.target.value })} /></label><label className="span-2">Ảnh đại diện (URL)<input value={roomForm.image} onChange={(e) => setRoomForm({ ...roomForm, image: e.target.value })} placeholder="https://…" /></label><label className="span-2">Mô tả<textarea rows="2" value={roomForm.description} onChange={(e) => setRoomForm({ ...roomForm, description: e.target.value })} /></label><button className="btn" type="submit">Lưu loại phòng & số phòng</button></form>}
        <div className="table-scroll"><table><thead><tr><th>Mã</th><th>Phòng</th><th>Loại phòng</th><th>Khách sạn</th><th>Giá / đêm</th><th>Trạng thái</th><th>Thao tác</th></tr></thead><tbody>{rooms.map((room) => <tr key={room.id}><td>R{String(room.id).padStart(3, '0')}</td><td>{room.roomNumber} · Tầng {room.floor || '—'}</td><td>{room.name}</td><td>{room.hotelName}</td><td>{money(room.price)}</td><td><span className={`status-pill status-${room.roomStatus}`}>{roomStatus[room.roomStatus] || room.roomStatus}</span></td><td><select className="table-select" value={room.roomStatus} onChange={(e) => updateRoom(room.id, e.target.value)}><option value="available">Đang mở bán</option><option value="cleaning">Đang dọn</option><option value="maintenance">Bảo trì</option><option value="inactive">Ngừng khai thác</option></select></td></tr>)}</tbody></table></div>
      </section>}
      {!loading && view === 'users' && <section className="admin-card"><div className="admin-card-heading"><div><h2>Khách hàng & tài khoản</h2><p>Quản lý quyền truy cập của người dùng.</p></div><span className="count-chip">{users.length} tài khoản</span></div><div className="table-scroll"><table><thead><tr><th>Khách hàng</th><th>Email</th><th>Phương thức</th><th>Xác minh</th><th>Vai trò</th><th>Trạng thái</th><th>Thao tác</th></tr></thead><tbody>{users.map((item) => <tr key={item.id}><td>{item.fullName}</td><td>{item.email}</td><td>{item.authProvider || 'local'}</td><td>{item.emailVerified ? 'Đã xác minh' : 'Chưa xác minh'}</td><td>{item.role}</td><td>{item.status}</td><td>{item.role !== 'admin' && <button className="table-btn" onClick={() => updateUser(item.id, item.status === 'active' ? 'locked' : 'active')}>{item.status === 'active' ? 'Khóa' : 'Mở khóa'}</button>}</td></tr>)}</tbody></table></div></section>}
    </main></div>;
}

function BookingTable({ bookings, onUpdate, onConfirmBank }) {
  return <div className="table-scroll"><table><thead><tr><th>Mã đơn</th><th>Khách hàng</th><th>Phòng / khách sạn</th><th>Thời gian</th><th>Tổng tiền</th><th>Thanh toán</th><th>Trạng thái</th><th>Thao tác</th></tr></thead><tbody>{bookings.map((booking) => <tr key={booking.id}><td><strong>{booking.code}</strong></td><td>{booking.guestName}<small className="table-sub">{booking.guestEmail}</small></td><td>{booking.roomName}<small className="table-sub">{booking.hotelName}</small></td><td>{dateLabel(booking.checkIn)}<small className="table-sub">đến {dateLabel(booking.checkOut)}</small></td><td>{money(booking.totalAmount)}</td><td><span className={`status-pill status-${booking.paymentStatus || 'pending'}`}>{booking.paymentStatus === 'paid' ? 'Đã thanh toán' : booking.paymentStatus === 'failed' ? 'Thất bại' : 'Chưa thanh toán'}</span><small className="table-sub">{booking.paymentProvider || '—'}</small></td><td>{bookingStatus[booking.status] || booking.status}</td><td><div className="table-actions">{booking.paymentProvider === 'bank_transfer' && booking.paymentStatus === 'pending' && <button className="table-btn" onClick={() => onConfirmBank(booking.paymentId)}>Đối soát</button>}<select className="table-select" value={booking.status} onChange={(e) => onUpdate(booking.id, e.target.value)}><option value="pending">Chờ thanh toán</option><option value="confirmed">Đã xác nhận</option><option value="checked_in">Nhận phòng</option><option value="checked_out">Trả phòng</option><option value="cancelled">Hủy đơn</option></select></div></td></tr>)}</tbody></table>{!bookings.length && <div className="table-empty">Chưa có đơn đặt phòng.</div>}</div>;
}
