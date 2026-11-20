import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { getHotels, getRooms } from '../api/rooms';
import RoomCard from '../components/RoomCard';

function formatVietnamDate(date = new Date()) {
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Ho_Chi_Minh', year: 'numeric', month: '2-digit', day: '2-digit' }).format(date);
}

function addDays(value, days) {
  const date = new Date(`${value}T00:00:00.000Z`);
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}

const today = formatVietnamDate();
const tomorrow = addDays(today, 1);

export default function Home() {
  const navigate = useNavigate();
  const [destination, setDestination] = useState('');
  const [checkIn, setCheckIn] = useState(today);
  const [checkOut, setCheckOut] = useState(tomorrow);
  const [guests, setGuests] = useState('2');
  const [rooms, setRooms] = useState([]);
  const [hotels, setHotels] = useState([]);
  const [error, setError] = useState('');

  useEffect(() => {
    getRooms().then((data) => setRooms(data.rooms.slice(0, 3))).catch(() => setRooms([]));
    getHotels().then((data) => setHotels(data.hotels.slice(0, 4))).catch(() => setHotels([]));
  }, []);

  function search(event) {
    event.preventDefault();
    if (checkOut <= checkIn) return setError('Ngày trả phòng phải sau ngày nhận phòng.');
    setError('');
    navigate(`/rooms?${new URLSearchParams({ destination, checkIn, checkOut, guests })}`);
  }

  return <>
    <section className="hero-home">
      <div className="hero-overlay"><div className="container hero-copy">
        <span className="eyebrow">MỘT HÀNH TRÌNH · NGÀN TRẢI NGHIỆM</span>
        <h1>Nơi kỳ nghỉ<br /><em>bắt đầu thật đẹp.</em></h1>
        <p>Khám phá những không gian lưu trú được chọn lọc, nơi sự thoải mái và những khoảnh khắc đáng nhớ luôn song hành.</p>
        <a href="#search" className="btn btn-light">Tìm kỳ nghỉ của bạn <span>↓</span></a>
        <div className="hero-proof"><span>✦ 4.9/5 trải nghiệm</span><span>✓ Đặt phòng an tâm</span><span>⌂ Điểm đến Việt Nam</span></div>
      </div></div>
    </section>

    <section className="container search-section" id="search">
      <form className="search-panel" onSubmit={search}>
        <label><span>✦ ĐIỂM ĐẾN</span><input value={destination} onChange={(e) => setDestination(e.target.value)} placeholder="Bạn muốn đến đâu?" /></label>
        <label><span>↗ NHẬN PHÒNG</span><input type="date" min={today} value={checkIn} onChange={(e) => { const nextCheckIn = e.target.value; setCheckIn(nextCheckIn); if (checkOut <= nextCheckIn) setCheckOut(addDays(nextCheckIn, 1)); }} required /></label>
        <label><span>↙ TRẢ PHÒNG</span><input type="date" min={checkIn || today} value={checkOut} onChange={(e) => setCheckOut(e.target.value)} required /></label>
        <label><span>♙ SỐ KHÁCH</span><select value={guests} onChange={(e) => setGuests(e.target.value)}><option value="1">1 khách</option><option value="2">2 khách</option><option value="3">3 khách</option><option value="4">4 khách</option><option value="5">5 khách</option><option value="6">6 khách</option></select></label>
        <button className="btn search-submit" type="submit">Tìm phòng <span>↗</span></button>
        {error && <p className="form-error">{error}</p>}
      </form>
    </section>

    <section className="container section section-tight">
      <div className="section-heading"><div><span className="eyebrow dark">LỰA CHỌN NỔI BẬT</span><h2>Chốn nghỉ dưỡng được yêu thích</h2><p className="section-lead">Những căn phòng dành cho những ngày bạn muốn sống chậm lại.</p></div><Link to="/rooms" className="text-link">Khám phá tất cả ↗</Link></div>
      <div className="rooms-grid">{rooms.map((room) => <RoomCard key={room.id} room={room} />)}</div>
      {!rooms.length && <div className="empty-state">Chưa tải được dữ liệu phòng. Hãy kiểm tra API và cơ sở dữ liệu rồi tải lại trang.</div>}
    </section>

    <section className="destination-section">
      <div className="container section">
        <div className="section-heading"><div><span className="eyebrow dark">ĐIỂM ĐẾN ĐANG CHỜ BẠN</span><h2>Mỗi thành phố, một câu chuyện</h2><p className="section-lead">Chọn nơi bạn muốn thức dậy vào ngày mai.</p></div></div>
        <div className="destination-grid">
          {(hotels.length ? hotels : []).map((hotel, index) => <Link className={`destination-card destination-${index + 1}`} key={hotel.id} to={`/rooms?destination=${encodeURIComponent(hotel.city)}`} style={{ backgroundImage: `linear-gradient(180deg,transparent 15%,rgba(9,29,44,.78)),url(${hotel.image || 'https://images.unsplash.com/photo-1566073771259-6a8506099945?auto=format&fit=crop&w=1000&q=85'})` }}><span>{hotel.stars || 4} ★</span><strong>{hotel.city}</strong><small>{hotel.availableRooms} phòng đang mở bán</small></Link>)}
        </div>
      </div>
    </section>

    <section className="container section about-strip">
      <div className="about-grid"><div className="about-photo-stack"><img src="https://images.unsplash.com/photo-1564501049412-61c2a3083791?auto=format&fit=crop&w=1200&q=85" alt="Không gian nghỉ dưỡng" /><div className="photo-caption"><strong>Stay a little longer.</strong><span>Make every moment count.</span></div></div><div><span className="eyebrow dark">TRẢI NGHIỆM VNHOTEL</span><h2>Không chỉ là một nơi lưu trú.</h2><p className="section-lead">Chúng tôi tin rằng một kỳ nghỉ đáng nhớ bắt đầu từ cảm giác được chào đón. Từ tìm kiếm, đặt phòng đến thanh toán, mọi bước đều được thiết kế rõ ràng và thuận tiện.</p><ul className="benefit-list"><li><b>01</b><span><strong>Thông tin minh bạch</strong><small>Giá phòng, tiện nghi và điều kiện đặt phòng rõ ràng.</small></span></li><li><b>02</b><span><strong>Thanh toán linh hoạt</strong><small>Chuyển khoản QR, ví điện tử và thanh toán quốc tế.</small></span></li><li><b>03</b><span><strong>Quản lý dễ dàng</strong><small>Theo dõi đơn đặt phòng trong một tài khoản.</small></span></li></ul><Link className="btn" to="/about">Tìm hiểu về chúng tôi ↗</Link></div></div>
    </section>
  </>;
}
