import { useEffect, useState } from 'react';
import { Link, useParams, useSearchParams } from 'react-router-dom';
import { getRoom } from '../api/rooms';
import { money } from '../data/rooms';

const today = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Ho_Chi_Minh', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date());

function addOneDay(value) {
  if (!value) return '';
  const date = new Date(`${value}T00:00:00`);
  date.setDate(date.getDate() + 1);
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

export default function RoomDetail() {
  const { id } = useParams();
  const [searchParams, setSearchParams] = useSearchParams();
  const [room, setRoom] = useState(null);
  const [checkIn, setCheckIn] = useState(searchParams.get('checkIn') || '');
  const [checkOut, setCheckOut] = useState(searchParams.get('checkOut') || '');
  const [guests, setGuests] = useState(searchParams.get('guests') || '2');
  const [loading, setLoading] = useState(true);
  const [checkingAvailability, setCheckingAvailability] = useState(false);
  const [error, setError] = useState('');

  const hasDateRange = Boolean(checkIn && checkOut && checkOut > checkIn && checkIn >= today);

  useEffect(() => {
    let active = true;
    const validRange = Boolean(checkIn && checkOut && checkOut > checkIn && checkIn >= today);
    const invalidRange = Boolean((checkIn || checkOut) && !validRange);
    setError(invalidRange ? checkIn && checkIn < today ? 'Ngày nhận phòng không thể nằm trong quá khứ.' : 'Vui lòng chọn ngày trả phòng sau ngày nhận phòng.' : '');
    setCheckingAvailability(true);
    const dateParams = validRange ? { checkIn, checkOut } : {};
    getRoom(id, dateParams)
      .then((data) => { if (active) setRoom(data.room); })
      .catch((err) => { if (active) setError(err.response?.data?.message || 'Không tìm thấy phòng.'); })
      .finally(() => {
        if (!active) return;
        setLoading(false);
        setCheckingAvailability(false);
      });

    return () => { active = false; };
  }, [id, checkIn, checkOut]);

  function updateSearch(event) {
    event.preventDefault();
    if (!checkIn || !checkOut || checkOut <= checkIn || checkIn < today) {
      setError(checkIn && checkIn < today ? 'Ngày nhận phòng không thể nằm trong quá khứ.' : 'Vui lòng chọn ngày nhận phòng và trả phòng hợp lệ để kiểm tra tình trạng phòng.');
      return;
    }
    setError('');
    setSearchParams({ checkIn, checkOut, guests });
  }

  const bookingQuery = new URLSearchParams({ room: id, checkIn, checkOut, guests }).toString();
  if (loading) return <div className="page-loader">Đang tải thông tin phòng…</div>;
  if (!room) return <main className="container section"><div className="empty-state"><h2>{error || 'Không tìm thấy phòng'}</h2><Link to="/rooms" className="btn">Quay lại danh sách phòng</Link></div></main>;

  return <main className="container section detail-page">
    <Link className="back-link" to={`/rooms${searchParams.toString() ? `?${searchParams.toString()}` : ''}`}>← Quay lại danh sách</Link>
    <div className="detail-gallery"><img className="detail-main-photo" src={room.image} alt={room.name} /><div className="detail-side-photos"><img src={room.images?.[1] || room.image} alt="Không gian phòng" /><div className="detail-photo-note"><span>{room.stars} ★</span><strong>{room.hotelName}</strong><small>{room.address}, {room.location}</small></div></div></div>
    <div className="detail-layout">
      <section className="detail-info">
        <span className="eyebrow dark">{room.hotelName} · {room.location}</span>
        <h1>{room.name}</h1>
        <p className="section-lead">{room.description}</p>
        <div className="detail-facts"><span>▣ {room.area} m²</span><span>♙ Tối đa {room.capacity} khách</span><span>▤ {room.bedType || 'Giường tiêu chuẩn'}</span></div>
        <h3>Tiện nghi trong phòng</h3>
        <div className="amenities-grid">{room.amenities.map((item) => <span key={item}>✓ {item}</span>)}</div>
        <div className="detail-description"><h3>Về không gian này</h3><p>Được chăm chút để mang đến cảm giác thoải mái trong suốt kỳ nghỉ. Chọn ngày nhận và trả phòng để xem số lượng phòng còn trống chính xác trong khoảng thời gian bạn muốn lưu trú.</p></div>
      </section>
      <aside className="booking-aside detail-booking-card">
        <div className="price-line"><strong>{money(room.price)}</strong><span>/ đêm</span></div>
        <form className="availability-search-form" onSubmit={updateSearch}>
          <label>Ngày nhận phòng<input type="date" min={today} value={checkIn} onChange={(event) => { const nextCheckIn = event.target.value; setCheckIn(nextCheckIn); if (checkOut && checkOut <= nextCheckIn) setCheckOut(addOneDay(nextCheckIn)); }} /></label>
          <label>Ngày trả phòng<input type="date" min={checkIn || today} value={checkOut} onChange={(event) => setCheckOut(event.target.value)} /></label>
          <label>Số khách<select value={guests} onChange={(event) => setGuests(event.target.value)}>{Array.from({ length: room.capacity }, (_, index) => index + 1).map((count) => <option key={count} value={count}>{count} khách</option>)}</select></label>
          <button className="btn btn-outline btn-wide" type="submit" disabled={checkingAvailability || !hasDateRange}>Kiểm tra phòng trống</button>
        </form>
        <div className={`availability-result ${hasDateRange && room.availableRooms === 0 ? 'is-unavailable' : 'is-available'}`} aria-live="polite">
          <span className="availability-dot" />
          {checkingAvailability ? 'Đang kiểm tra lịch phòng…' : hasDateRange
            ? room.availableRooms > 0 ? `Còn ${room.availableRooms} phòng từ ${checkIn} đến ${checkOut}` : `Rất tiếc, đã hết phòng từ ${checkIn} đến ${checkOut}`
            : `${room.totalRooms} phòng đang mở bán · chọn ngày để kiểm tra lịch trống`}
        </div>
        {error && <div className="alert alert-error">{error}</div>}
        <p className="muted">Giá cuối cùng được tính theo số đêm và xác nhận ở bước đặt phòng.</p>
        <Link to={hasDateRange && room.availableRooms > 0 ? `/booking?${bookingQuery}` : '#availability'} onClick={(event) => { if (!hasDateRange || room.availableRooms <= 0 || checkingAvailability || Boolean(error)) event.preventDefault(); }} className={`btn btn-wide ${!hasDateRange || room.availableRooms <= 0 || checkingAvailability || Boolean(error) ? 'is-disabled' : ''}`}>Đặt phòng này ↗</Link>
        <div className="secure-note">♧ Thanh toán bảo mật · Hỗ trợ nhiều phương thức</div>
      </aside>
    </div>
  </main>;
}
