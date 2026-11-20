import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { getHotels, getRooms } from '../api/rooms';
import RoomCard from '../components/RoomCard';
import { vietnamDate } from '../utils/dates';

const HOTEL_CITY = 'Đà Lạt';

export default function Home() {
  const navigate = useNavigate();
  const [checkIn, setCheckIn] = useState(vietnamDate(1));
  const [checkOut, setCheckOut] = useState(vietnamDate(2));
  const [guests, setGuests] = useState('2');
  const [rooms, setRooms] = useState([]);
  const [hotel, setHotel] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    getRooms({ destination: HOTEL_CITY, checkIn, checkOut, guests: 2 })
      .then((data) => setRooms(data.rooms.slice(0, 3)))
      .catch(() => setRooms([]));
  }, [checkIn, checkOut]);

  useEffect(() => {
    getHotels().then((data) => setHotel(data.hotels[0] || null)).catch(() => setHotel(null));
  }, []);

  function search(event) {
    event.preventDefault();
    if (checkOut <= checkIn) return setError('Ngày trả phòng phải sau ngày nhận phòng.');
    setError('');
    navigate(`/rooms?${new URLSearchParams({ destination: HOTEL_CITY, checkIn, checkOut, guests })}`);
  }

  return <>
    <section className="hero-home">
      <div className="hero-overlay"><div className="container hero-copy">
        <span className="eyebrow">VNHotel ĐÀ LẠT · THÀNH PHỐ NGÀN HOA</span>
        <h1>Chạm vào bình yên<br /><em>giữa phố núi mộng mơ.</em></h1>
        <p>Khám phá các hạng phòng tại VNHotel Đà Lạt, xem tình trạng phòng theo ngày và đặt kỳ nghỉ của bạn chỉ trong vài bước.</p>
        <a href="#search" className="btn btn-light">Tìm phòng tại Đà Lạt <span>↓</span></a>
        <div className="hero-proof"><span>✦ Không gian nghỉ dưỡng</span><span>✓ Kiểm tra phòng theo ngày</span><span>⌂ Đà Lạt, Lâm Đồng</span></div>
      </div></div>
    </section>

    <section className="container search-section" id="search">
      <form className="search-panel" onSubmit={search}>
        <label><span>✦ KHÁCH SẠN</span><input value="VNHotel Đà Lạt" readOnly /></label>
        <label><span>↗ NHẬN PHÒNG</span><input type="date" min={vietnamDate(0)} value={checkIn} onChange={(e) => setCheckIn(e.target.value)} required /></label>
        <label><span>↙ TRẢ PHÒNG</span><input type="date" min={checkIn || vietnamDate(0)} value={checkOut} onChange={(e) => setCheckOut(e.target.value)} required /></label>
        <label><span>♙ SỐ KHÁCH</span><select value={guests} onChange={(e) => setGuests(e.target.value)}>{[1, 2, 3, 4, 5, 6].map((n) => <option key={n} value={n}>{n} khách</option>)}</select></label>
        <button className="btn search-submit" type="submit">Kiểm tra phòng <span>↗</span></button>
        {error && <p className="form-error">{error}</p>}
      </form>
    </section>

    <section className="container section section-tight">
      <div className="section-heading"><div><span className="eyebrow dark">CÁC HẠNG PHÒNG</span><h2>Chọn không gian nghỉ dưỡng</h2><p className="section-lead">Số phòng còn trống được tính theo ngày nhận và trả phòng bạn đã chọn.</p></div><Link to={`/rooms?${new URLSearchParams({ destination: HOTEL_CITY, checkIn, checkOut, guests })}`} className="text-link">Xem tất cả hạng phòng ↗</Link></div>
      <div className="rooms-grid">{rooms.map((room) => <RoomCard key={room.id} room={room} checkIn={checkIn} checkOut={checkOut} guests={guests} />)}</div>
      {!rooms.length && <div className="empty-state">Chưa tải được dữ liệu phòng. Vui lòng thử lại sau.</div>}
    </section>

    <section className="destination-section">
      <div className="container section">
        <div className="section-heading"><div><span className="eyebrow dark">ĐIỂM ĐẾN CỦA BẠN</span><h2>Kỳ nghỉ của bạn tại Đà Lạt</h2><p className="section-lead">Khám phá các hạng phòng và dịch vụ lưu trú tại VNHotel Đà Lạt.</p></div></div>
        <div className="destination-grid single-destination-grid">
          <Link className="destination-card destination-1" to={`/rooms?${new URLSearchParams({ destination: HOTEL_CITY, checkIn, checkOut, guests })}`} style={{ backgroundImage: `linear-gradient(180deg,transparent 15%,rgba(9,29,44,.78)),url(${hotel?.image || 'https://images.unsplash.com/photo-1566073771259-6a8506099945?auto=format&fit=crop&w=1400&q=85'})` }}>
            <span>{hotel?.stars || 4} ★</span><strong>{hotel?.name || 'VNHotel Đà Lạt'}</strong><small>{hotel?.address || 'Đà Lạt, Lâm Đồng'} · {hotel?.availableRooms ?? '—'} phòng đang mở bán</small>
          </Link>
        </div>
      </div>
    </section>

    <section className="container section about-strip">
      <div className="about-grid"><div className="about-photo-stack"><img src="https://images.unsplash.com/photo-1564501049412-61c2a3083791?auto=format&fit=crop&w=1200&q=85" alt="Không gian nghỉ dưỡng" /><div className="photo-caption"><strong>Stay a little longer.</strong><span>Make every moment count.</span></div></div><div><span className="eyebrow dark">TRẢI NGHIỆM VNHOTEL ĐÀ LẠT</span><h2>Một kỳ nghỉ nhẹ nhàng giữa phố núi.</h2><p className="section-lead">Từ tìm kiếm phòng trống, đặt phòng đến thanh toán và nhận phòng, mọi bước đều được thiết kế rõ ràng, thuận tiện.</p><ul className="benefit-list"><li><b>01</b><span><strong>Thông tin minh bạch</strong><small>Giá phòng, tiện nghi và số lượng còn trống theo ngày.</small></span></li><li><b>02</b><span><strong>Thanh toán linh hoạt</strong><small>Thanh toán trực tuyến hoặc trực tiếp tại quầy lễ tân.</small></span></li><li><b>03</b><span><strong>Hỗ trợ tại khách sạn</strong><small>Lễ tân tiếp nhận đơn, xác nhận thanh toán và hỗ trợ nhận/trả phòng.</small></span></li></ul><Link className="btn" to="/about">Tìm hiểu về VNHotel ↗</Link></div></div>
    </section>
  </>;
}
