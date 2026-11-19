import { useEffect, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { createBooking } from '../api/bookings';
import { getRoom } from '../api/rooms';
import { money } from '../data/rooms';
import { useAuth } from '../context/AuthContext';

const today = new Date().toISOString().slice(0, 10);
const tomorrow = new Date(Date.now() + 86400000).toISOString().slice(0, 10);

export default function Booking() {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [room, setRoom] = useState(null);
  const [checkIn, setCheckIn] = useState(today);
  const [checkOut, setCheckOut] = useState(tomorrow);
  const [guests, setGuests] = useState('2');
  const [promotionCode, setPromotionCode] = useState('');
  const [note, setNote] = useState('');
  const [phone, setPhone] = useState(user?.phone || '');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  useEffect(() => { getRoom(params.get('room')).then((data) => { setRoom(data.room); setGuests(String(Math.min(2, data.room.capacity))); }).catch((err) => setError(err.response?.data?.message || 'Không tải được loại phòng.')); }, [params]);
  const nights = checkIn && checkOut && checkOut > checkIn ? Math.round((Date.parse(`${checkOut}T00:00:00`) - Date.parse(`${checkIn}T00:00:00`)) / 86400000) : 0;
  async function submit(event) {
    event.preventDefault(); setError('');
    if (!room) return setError('Vui lòng chọn loại phòng.');
    if (checkOut <= checkIn) return setError('Ngày trả phòng phải sau ngày nhận phòng.');
    if (Number(guests) > room.capacity) return setError(`Phòng chỉ nhận tối đa ${room.capacity} khách.`);
    if (!phone.trim()) return setError('Vui lòng nhập số điện thoại liên hệ.');
    try {
      setLoading(true);
      const result = await createBooking({ roomTypeId: room.id, checkIn, checkOut, numGuests: Number(guests), guestName: user.fullName, guestEmail: user.email, guestPhone: phone, promotionCode, note });
      navigate(`/checkout/${result.booking.bookingCode}`);
    } catch (err) { setError(err.response?.data?.message || 'Không thể tạo đơn đặt phòng.'); }
    finally { setLoading(false); }
  }
  if (!user) return <main className="container section"><div className="empty-state"><h2>Đăng nhập để tiếp tục đặt phòng</h2><p>Đơn đặt phòng sẽ được lưu trong tài khoản của bạn.</p><Link to="/login" className="btn">Đăng nhập ngay</Link></div></main>;
  return <main className="container section"><span className="eyebrow dark">CHỈ CÒN MỘT VÀI BƯỚC</span><h1>Hoàn tất thông tin đặt phòng</h1><p className="section-lead">Kiểm tra ngày lưu trú và thông tin liên hệ trước khi thanh toán.</p>
    <div className="booking-layout"><form className="booking-form stack-form" onSubmit={submit}><div className="form-section-title"><span>01</span><div><h3>Thông tin lưu trú</h3><p>Chọn ngày và số lượng khách.</p></div></div><div className="two-col"><label>Ngày nhận phòng<input type="date" min={today} required value={checkIn} onChange={(e) => setCheckIn(e.target.value)} /></label><label>Ngày trả phòng<input type="date" min={checkIn} required value={checkOut} onChange={(e) => setCheckOut(e.target.value)} /></label></div><label>Số khách<select value={guests} onChange={(e) => setGuests(e.target.value)}>{Array.from({ length: room?.capacity || 4 }, (_, i) => i + 1).map((n) => <option value={n} key={n}>{n} khách</option>)}</select></label>
      <div className="form-section-title"><span>02</span><div><h3>Thông tin người đặt</h3><p>Thông tin được dùng để gửi xác nhận đơn.</p></div></div><label>Họ và tên<input value={user.fullName} readOnly /></label><label>Email<input value={user.email} readOnly /></label><label>Số điện thoại<input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="09xxxxxxxx" required /></label><label>Mã ưu đãi (nếu có)<input value={promotionCode} onChange={(e) => setPromotionCode(e.target.value.toUpperCase())} placeholder="VD: WELCOME10" /></label><label>Yêu cầu thêm<textarea rows="3" value={note} onChange={(e) => setNote(e.target.value)} placeholder="Giờ nhận phòng dự kiến, yêu cầu giường…" /></label>
      {error && <div className="alert alert-error">{error}</div>}<button className="btn btn-wide" type="submit" disabled={loading || !room}>{loading ? 'Đang tạo đơn…' : 'Xác nhận thông tin & thanh toán ↗'}</button><p className="form-footnote">Bạn sẽ được chuyển sang bước thanh toán. Đơn chỉ được xác nhận sau khi thanh toán được đối soát thành công.</p></form>
      <aside className="booking-aside"><h3>Tóm tắt đặt phòng</h3>{room && <><img src={room.image} alt={room.name} /><span className="eyebrow dark">{room.hotelName}</span><h4>{room.name}</h4><p className="muted">{room.location} · tối đa {room.capacity} khách</p></>}<div className="summary-row"><span>Nhận phòng</span><strong>{checkIn}</strong></div><div className="summary-row"><span>Trả phòng</span><strong>{checkOut}</strong></div><div className="summary-row"><span>Số đêm</span><strong>{nights || '—'}</strong></div><div className="summary-row"><span>Giá / đêm</span><strong>{room ? money(room.price) : '—'}</strong></div><div className="summary-total"><span>Tạm tính</span><strong>{room && nights ? money(room.price * nights) : '—'}</strong></div></aside></div>
  </main>;
}
