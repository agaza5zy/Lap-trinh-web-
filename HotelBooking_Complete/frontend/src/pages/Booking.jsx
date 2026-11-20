import { useEffect, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { createBooking } from '../api/bookings';
import { getRoom } from '../api/rooms';
import { money } from '../data/rooms';
import { useAuth } from '../context/AuthContext';

function formatVietnamDate(date = new Date()) {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Ho_Chi_Minh', year: 'numeric', month: '2-digit', day: '2-digit',
  }).format(date);
}

function addDays(value, days) {
  const date = new Date(`${value}T00:00:00.000Z`);
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}

const today = formatVietnamDate();
const tomorrow = addDays(today, 1);

export default function Booking() {
  const [params] = useSearchParams();
  const roomId = params.get('room');
  const navigate = useNavigate();
  const { user } = useAuth();
  const [room, setRoom] = useState(null);
  const [checkIn, setCheckIn] = useState(params.get('checkIn') || today);
  const [checkOut, setCheckOut] = useState(params.get('checkOut') || tomorrow);
  const [guests, setGuests] = useState(params.get('guests') || '2');
  const [promotionCode, setPromotionCode] = useState('');
  const [note, setNote] = useState('');
  const [phone, setPhone] = useState(user?.phone || '');
  const [loading, setLoading] = useState(false);
  const [checkingAvailability, setCheckingAvailability] = useState(true);
  const [availabilityReady, setAvailabilityReady] = useState(false);
  const [error, setError] = useState('');

  const nights = checkIn && checkOut && checkOut > checkIn
    ? Math.round((Date.parse(`${checkOut}T00:00:00Z`) - Date.parse(`${checkIn}T00:00:00Z`)) / 86400000)
    : 0;
  const validDateRange = Boolean(checkIn && checkOut && checkOut > checkIn);

  useEffect(() => {
    let active = true;
    if (!roomId) {
      setError('Không tìm thấy loại phòng cần đặt. Vui lòng quay lại danh sách phòng.');
      setCheckingAvailability(false);
      setAvailabilityReady(false);
      return () => { active = false; };
    }

    setCheckingAvailability(true);
    setAvailabilityReady(false);
    const hasValidDates = Boolean(checkIn && checkOut && checkOut > checkIn);
    if (!hasValidDates) setError('Ngày trả phòng phải sau ngày nhận phòng.');
    else setError('');

    const dateParams = hasValidDates ? { checkIn, checkOut } : {};
    getRoom(roomId, dateParams)
      .then((data) => {
        if (!active) return;
        setRoom(data.room);
        setAvailabilityReady(true);
        if (Number(guests) > data.room.capacity) setGuests(String(Math.min(2, data.room.capacity)));
      })
      .catch((err) => {
        if (active) {
          setAvailabilityReady(false);
          setError(err.response?.data?.message || 'Không tải được thông tin phòng.');
        }
      })
      .finally(() => { if (active) setCheckingAvailability(false); });

    return () => { active = false; };
  }, [roomId, checkIn, checkOut, guests]);

  async function submit(event) {
    event.preventDefault();
    setError('');
    if (!room) return setError('Vui lòng chọn loại phòng.');
    if (!availabilityReady) return setError('Chưa kiểm tra được tình trạng phòng. Vui lòng thử lại.');
    if (!validDateRange) return setError('Ngày trả phòng phải sau ngày nhận phòng.');
    if (checkIn < today) return setError('Ngày nhận phòng không thể nằm trong quá khứ.');
    if (Number(guests) > room.capacity) return setError(`Phòng chỉ nhận tối đa ${room.capacity} khách.`);
    if (!phone.trim()) return setError('Vui lòng nhập số điện thoại liên hệ.');

    try {
      setLoading(true);
      // Recheck immediately before creating the booking. The backend also checks
      // and locks an actual room inside its transaction to prevent double booking.
      const latest = await getRoom(room.id, { checkIn, checkOut });
      setRoom(latest.room);
      setAvailabilityReady(true);
      if (latest.room.availableRooms < 1) {
        setError('Rất tiếc, phòng vừa được khách khác đặt trong khoảng ngày này. Vui lòng chọn ngày khác.');
        return;
      }

      let result;
      try {
        result = await createBooking({
          roomTypeId: room.id,
          checkIn,
          checkOut,
          numGuests: Number(guests),
          guestName: user.fullName,
          guestEmail: user.email,
          guestPhone: phone,
          promotionCode,
          note,
        });
      } catch (bookingError) {
        if (bookingError.response?.status === 409) {
          try {
            const refreshed = await getRoom(room.id, { checkIn, checkOut });
            setRoom(refreshed.room);
            setAvailabilityReady(true);
          } catch {
            setAvailabilityReady(false);
          }
        }
        setError(bookingError.response?.data?.message || bookingError.message || 'Không thể tạo đơn đặt phòng.');
        return;
      }
      navigate(`/checkout/${result.booking.bookingCode}`);
    } catch (err) {
      setAvailabilityReady(false);
      setError(err.response?.data?.message || err.message || 'Không thể kiểm tra tình trạng phòng.');
    } finally {
      setLoading(false);
    }
  }

  if (!user) return <main className="container section"><div className="empty-state"><h2>Đăng nhập để tiếp tục đặt phòng</h2><p>Đơn đặt phòng sẽ được lưu trong tài khoản của bạn.</p><Link to="/login" className="btn">Đăng nhập ngay</Link></div></main>;

  return <main className="container section">
    <span className="eyebrow dark">CHỈ CÒN MỘT VÀI BƯỚC</span>
    <h1>Hoàn tất thông tin đặt phòng</h1>
    <p className="section-lead">Kiểm tra ngày lưu trú và tình trạng phòng trước khi tiếp tục thanh toán.</p>
    <div className="booking-layout">
      <form className="booking-form stack-form" onSubmit={submit}>
        <div className="form-section-title"><span>01</span><div><h3>Thông tin lưu trú</h3><p>Chọn ngày và số lượng khách.</p></div></div>
        <div className="two-col">
          <label>Ngày nhận phòng<input type="date" min={today} required value={checkIn} onChange={(event) => {
            const nextCheckIn = event.target.value;
            setCheckIn(nextCheckIn);
            if (checkOut <= nextCheckIn) setCheckOut(addDays(nextCheckIn, 1));
          }} /></label>
          <label>Ngày trả phòng<input type="date" min={checkIn || today} required value={checkOut} onChange={(event) => setCheckOut(event.target.value)} /></label>
        </div>
        <label>Số khách<select value={guests} onChange={(event) => setGuests(event.target.value)}>{Array.from({ length: room?.capacity || 4 }, (_, index) => index + 1).map((count) => <option value={count} key={count}>{count} khách</option>)}</select></label>
        <div className={`availability-result booking-availability ${validDateRange && (!availabilityReady || room?.availableRooms < 1) ? 'is-unavailable' : 'is-available'}`} aria-live="polite">
          <span className="availability-dot" />
          {checkingAvailability ? 'Đang kiểm tra phòng trống theo ngày…' : !validDateRange
            ? 'Vui lòng chọn ngày nhận phòng và trả phòng hợp lệ.'
            : !availabilityReady ? 'Chưa kiểm tra được tình trạng phòng. Vui lòng thử lại.'
            : room?.availableRooms > 0 ? `Còn ${room.availableRooms} phòng trống trong khoảng ngày đã chọn`
              : 'Đã hết phòng trong khoảng ngày này. Hãy thử ngày khác.'}
        </div>

        <div className="form-section-title"><span>02</span><div><h3>Thông tin người đặt</h3><p>Thông tin được dùng để gửi xác nhận đơn.</p></div></div>
        <label>Họ và tên<input value={user.fullName} readOnly /></label>
        <label>Email<input value={user.email} readOnly /></label>
        <label>Số điện thoại<input value={phone} onChange={(event) => setPhone(event.target.value)} placeholder="09xxxxxxxx" required /></label>
        <label>Mã ưu đãi (nếu có)<input value={promotionCode} onChange={(event) => setPromotionCode(event.target.value.toUpperCase())} placeholder="VD: WELCOME10" /></label>
        <label>Yêu cầu thêm<textarea rows="3" value={note} onChange={(event) => setNote(event.target.value)} placeholder="Giờ nhận phòng dự kiến, yêu cầu giường…" /></label>
        {error && <div className="alert alert-error">{error}</div>}
        <button className="btn btn-wide" type="submit" disabled={loading || checkingAvailability || !room || !availabilityReady || !validDateRange || room.availableRooms < 1}>
          {loading ? 'Đang tạo đơn…' : checkingAvailability ? 'Đang kiểm tra phòng…' : room?.availableRooms < 1 ? 'Đã hết phòng' : 'Xác nhận thông tin & thanh toán ↗'}
        </button>
        <p className="form-footnote">Tình trạng phòng được kiểm tra lại trước khi tạo đơn. Đơn chỉ được xác nhận sau khi thanh toán được đối soát thành công.</p>
      </form>

      <aside className="booking-aside">
        <h3>Tóm tắt đặt phòng</h3>
        {room && <><img src={room.image} alt={room.name} /><span className="eyebrow dark">{room.hotelName}</span><h4>{room.name}</h4><p className="muted">{room.location} · tối đa {room.capacity} khách</p></>}
        <div className="summary-row"><span>Nhận phòng</span><strong>{checkIn || '—'}</strong></div>
        <div className="summary-row"><span>Trả phòng</span><strong>{checkOut || '—'}</strong></div>
        <div className="summary-row"><span>Số đêm</span><strong>{nights || '—'}</strong></div>
        <div className="summary-row"><span>Số khách</span><strong>{guests}</strong></div>
        <div className="summary-row"><span>Phòng còn trống</span><strong>{checkingAvailability ? 'Đang kiểm tra…' : availabilityReady ? room?.availableRooms ?? '—' : 'Chưa kiểm tra'}</strong></div>
        <div className="summary-row"><span>Giá / đêm</span><strong>{room ? money(room.price) : '—'}</strong></div>
        <div className="summary-total"><span>Tạm tính</span><strong>{room && nights ? money(room.price * nights) : '—'}</strong></div>
      </aside>
    </div>
  </main>;
}
