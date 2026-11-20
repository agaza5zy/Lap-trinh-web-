import { useEffect, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { createBooking } from '../api/bookings';
import { getRoom } from '../api/rooms';
import { money } from '../data/rooms';
import { useAuth } from '../context/AuthContext';
import { nightsBetween, vietnamDate } from '../utils/dates';

export default function Booking() {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const roomId = params.get('room');
  const [room, setRoom] = useState(null);
  const [checkIn, setCheckIn] = useState(params.get('checkIn') || vietnamDate(1));
  const [checkOut, setCheckOut] = useState(params.get('checkOut') || vietnamDate(2));
  const [guests, setGuests] = useState(params.get('guests') || '2');
  const [promotionCode, setPromotionCode] = useState('');
  const [note, setNote] = useState('');
  const [phone, setPhone] = useState(user?.phone || '');
  const [loading, setLoading] = useState(false);
  const [availabilityLoading, setAvailabilityLoading] = useState(true);
  const [error, setError] = useState('');
  const nights = nightsBetween(checkIn, checkOut);

  useEffect(() => {
    let alive = true;
    if (!roomId || !checkIn || !checkOut || checkOut <= checkIn) {
      setAvailabilityLoading(false);
      return () => { alive = false; };
    }
    setAvailabilityLoading(true);
    getRoom(roomId, { checkIn, checkOut })
      .then((data) => {
        if (!alive) return;
        setRoom(data.room);
        setGuests((current) => String(Math.min(Number(current) || 2, data.room.capacity)));
      })
      .catch((err) => { if (alive) setError(err.response?.data?.message || 'Không tải được loại phòng.'); })
      .finally(() => { if (alive) setAvailabilityLoading(false); });
    return () => { alive = false; };
  }, [roomId, checkIn, checkOut]);

  async function submit(event) {
    event.preventDefault();
    setError('');
    if (!room) return setError('Vui lòng chọn loại phòng.');
    if (checkOut <= checkIn) return setError('Ngày trả phòng phải sau ngày nhận phòng.');
    if (Number(guests) > room.capacity) return setError(`Loại phòng chỉ nhận tối đa ${room.capacity} khách.`);
    if (Number(room.availableRooms) < 1) return setError('Loại phòng đã hết trong khoảng ngày bạn chọn. Vui lòng chọn ngày khác.');
    if (!phone.trim()) return setError('Vui lòng nhập số điện thoại liên hệ.');
    try {
      setLoading(true);
      const result = await createBooking({ roomTypeId: room.id, checkIn, checkOut, numGuests: Number(guests), guestName: user.fullName, guestEmail: user.email, guestPhone: phone, promotionCode, note });
      navigate(`/checkout/${result.booking.bookingCode}`);
    } catch (err) {
      setError(err.response?.data?.message || 'Không thể tạo đơn đặt phòng.');
      if (err.response?.status === 409) getRoom(roomId, { checkIn, checkOut }).then((data) => setRoom(data.room)).catch(() => {});
    } finally {
      setLoading(false);
    }
  }

  if (!user) return <main className="container section"><div className="empty-state"><h2>Đăng nhập để tiếp tục đặt phòng</h2><p>Đơn đặt phòng sẽ được lưu trong tài khoản của bạn.</p><Link to="/login" className="btn">Đăng nhập ngay</Link></div></main>;
  const available = Number(room?.availableRooms || 0);
  return <main className="container section"><span className="eyebrow dark">VNHOTEL ĐÀ LẠT · ĐẶT PHÒNG</span><h1>Hoàn tất thông tin đặt phòng</h1><p className="section-lead">Hệ thống kiểm tra lại tình trạng phòng trước khi tạo đơn để tránh đặt trùng.</p>
    <div className="booking-layout"><form className="booking-form stack-form" onSubmit={submit}>
      <div className="form-section-title"><span>01</span><div><h3>Thông tin lưu trú</h3><p>Chọn ngày và số lượng khách.</p></div></div>
      <div className="two-col"><label>Ngày nhận phòng<input type="date" min={vietnamDate(0)} required value={checkIn} onChange={(e) => setCheckIn(e.target.value)} /></label><label>Ngày trả phòng<input type="date" min={checkIn} required value={checkOut} onChange={(e) => setCheckOut(e.target.value)} /></label></div>
      <label>Số khách<select value={guests} onChange={(e) => setGuests(e.target.value)}>{Array.from({ length: room?.capacity || 4 }, (_, index) => index + 1).map((n) => <option value={n} key={n}>{n} khách</option>)}</select></label>
      {availabilityLoading ? <div className="alert alert-info">Đang kiểm tra số phòng còn trống…</div> : room && <div className={`availability-result ${available > 0 ? 'available' : 'unavailable'}`}><span className="availability-dot" />{available > 0 ? `Còn ${available} phòng cho khoảng ngày này` : 'Hết phòng trong khoảng ngày bạn chọn'}</div>}
      <div className="form-section-title"><span>02</span><div><h3>Thông tin người đặt</h3><p>Thông tin được dùng để gửi xác nhận đơn.</p></div></div>
      <label>Họ và tên<input value={user.fullName} readOnly /></label><label>Email<input value={user.email} readOnly /></label><label>Số điện thoại<input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="09xxxxxxxx" required /></label><label>Mã ưu đãi (nếu có)<input value={promotionCode} onChange={(e) => setPromotionCode(e.target.value.toUpperCase())} placeholder="VD: WELCOME10" /></label><label>Yêu cầu thêm<textarea rows="3" value={note} onChange={(e) => setNote(e.target.value)} placeholder="Giờ nhận phòng dự kiến, yêu cầu giường…" /></label>
      {error && <div className="alert alert-error">{error}</div>}
      <button className="btn btn-wide" type="submit" disabled={loading || availabilityLoading || !room || available < 1}>{loading ? 'Đang tạo đơn…' : available < 1 ? 'Hiện không còn phòng' : 'Tạo đơn & chọn thanh toán ↗'}</button>
      <p className="form-footnote">Đơn sẽ ở trạng thái chờ xác nhận cho đến khi thanh toán được hệ thống hoặc lễ tân xác minh. Việc tạo đơn sẽ kiểm tra tồn phòng lại ở máy chủ.</p>
    </form>
    <aside className="booking-aside"><h3>Tóm tắt đặt phòng</h3>{room && <><img src={room.image} alt={room.name} /><span className="eyebrow dark">{room.hotelName}</span><h4>{room.name}</h4><p className="muted">{room.location} · tối đa {room.capacity} khách</p></>}<div className="summary-row"><span>Nhận phòng</span><strong>{checkIn}</strong></div><div className="summary-row"><span>Trả phòng</span><strong>{checkOut}</strong></div><div className="summary-row"><span>Số đêm</span><strong>{nights || '—'}</strong></div><div className="summary-row"><span>Giá / đêm</span><strong>{room ? money(room.price) : '—'}</strong></div><div className="summary-total"><span>Tạm tính</span><strong>{room && nights ? money(room.price * nights) : '—'}</strong></div></aside></div>
  </main>;
}
