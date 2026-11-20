import { useEffect, useState } from 'react';
import { Link, useParams, useSearchParams } from 'react-router-dom';
import { getRoom } from '../api/rooms';
import { money } from '../data/rooms';
import { vietnamDate } from '../utils/dates';

export default function RoomDetail() {
  const { id } = useParams();
  const [searchParams] = useSearchParams();
  const searchKey = searchParams.toString();
  const [room, setRoom] = useState(null);
  const [checkIn, setCheckIn] = useState(searchParams.get('checkIn') || vietnamDate(1));
  const [checkOut, setCheckOut] = useState(searchParams.get('checkOut') || vietnamDate(2));
  const [guests, setGuests] = useState(searchParams.get('guests') || '2');
  const [loading, setLoading] = useState(true);
  const [availabilityLoading, setAvailabilityLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    setCheckIn(searchParams.get('checkIn') || vietnamDate(1));
    setCheckOut(searchParams.get('checkOut') || vietnamDate(2));
    setGuests(searchParams.get('guests') || '2');
  }, [searchKey]);

  useEffect(() => {
    let alive = true;
    if (!checkIn || !checkOut || checkOut <= checkIn) {
      setError('Ngày trả phòng phải sau ngày nhận phòng.');
      setAvailabilityLoading(false);
      setLoading(false);
      return () => { alive = false; };
    }
    setError('');
    setAvailabilityLoading(true);
    getRoom(id, { checkIn, checkOut })
      .then((data) => { if (alive) setRoom(data.room); })
      .catch((err) => { if (alive) setError(err.response?.data?.message || 'Không tìm thấy phòng.'); })
      .finally(() => {
        if (alive) {
          setAvailabilityLoading(false);
          setLoading(false);
        }
      });
    return () => { alive = false; };
  }, [id, checkIn, checkOut]);

  if (loading) return <div className="page-loader">Đang tải thông tin phòng…</div>;
  if (!room) return <main className="container section"><div className="empty-state"><h2>{error || 'Không tìm thấy phòng'}</h2><Link to="/rooms" className="btn">Quay lại danh sách phòng</Link></div></main>;
  const available = Number(room.availableRooms || 0);
  const guestsAllowed = Number(guests) <= Number(room.capacity);
  const dateRangeValid = Boolean(checkIn && checkOut && checkOut > checkIn);
  const bookingQuery = new URLSearchParams({ checkIn, checkOut, guests });

  return <main className="container section detail-page">
    <Link className="back-link" to={`/rooms?${bookingQuery}`}>← Quay lại danh sách phòng</Link>
    <div className="detail-gallery"><img className="detail-main-photo" src={room.image} alt={room.name} /><div className="detail-side-photos"><img src={room.images?.[1] || room.image} alt="Không gian phòng" /><div className="detail-photo-note"><span>{room.stars} ★</span><strong>{room.hotelName}</strong><small>{room.address}, {room.location}</small></div></div></div>
    <div className="detail-layout"><section className="detail-info"><span className="eyebrow dark">{room.hotelName} · {room.location}</span><h1>{room.name}</h1><p className="section-lead">{room.description}</p><div className="detail-facts"><span>▣ {room.area} m²</span><span>♙ Tối đa {room.capacity} khách</span><span>▤ {room.bedType || 'Giường tiêu chuẩn'}</span></div><h3>Tiện nghi trong phòng</h3><div className="amenities-grid">{room.amenities.map((item) => <span key={item}>✓ {item}</span>)}</div><div className="detail-description"><h3>Về không gian này</h3><p>Giá và tình trạng phòng được kiểm tra theo khoảng ngày bạn chọn. Số phòng hiển thị là số phòng vật lý còn có thể đặt trong thời gian lưu trú.</p></div></section>
      <aside className="booking-aside detail-booking-card"><div className="price-line"><strong>{money(room.price)}</strong><span>/ đêm</span></div>
        <div className="availability-search">
          <label>Ngày nhận phòng<input type="date" min={vietnamDate(0)} value={checkIn} onChange={(e) => setCheckIn(e.target.value)} required /></label>
          <label>Ngày trả phòng<input type="date" min={checkIn} value={checkOut} onChange={(e) => setCheckOut(e.target.value)} required /></label>
          <label>Số khách<select value={guests} onChange={(e) => setGuests(e.target.value)}>{Array.from({ length: room.capacity }, (_, index) => index + 1).map((n) => <option key={n} value={n}>{n} khách</option>)}</select></label>
        </div>
        {availabilityLoading && <p className="muted">Đang cập nhật số phòng còn trống…</p>}
        <div className={`availability-result ${available > 0 && guestsAllowed && dateRangeValid && !error ? 'available' : 'unavailable'}`}><span className="availability-dot" />{!dateRangeValid ? 'Vui lòng chọn ngày nhận và trả phòng hợp lệ' : !guestsAllowed ? `Loại phòng chỉ nhận tối đa ${room.capacity} khách` : available > 0 ? `Còn ${available} phòng trong khoảng ngày đã chọn` : 'Hết phòng trong khoảng ngày đã chọn'}</div>
        <p className="muted">Giá cuối cùng được tính theo số đêm và xác nhận ở bước đặt phòng.</p>
        <Link to={`/booking?room=${room.id}&${bookingQuery}`} className={`btn btn-wide ${available <= 0 || !guestsAllowed || !dateRangeValid || availabilityLoading || Boolean(error) ? 'is-disabled' : ''}`} aria-disabled={available <= 0 || !guestsAllowed || !dateRangeValid || availabilityLoading || Boolean(error)} onClick={(event) => { if (available <= 0 || !guestsAllowed || !dateRangeValid || availabilityLoading || Boolean(error)) event.preventDefault(); }}>Đặt phòng này ↗</Link>
        <div className="secure-note">♧ Thanh toán bảo mật · Có thể thanh toán tại quầy lễ tân</div>
      </aside></div>
    {error && <div className="alert alert-error">{error}</div>}
  </main>;
}
