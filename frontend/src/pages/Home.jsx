import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import RoomCard from '../components/RoomCard';
import { rooms } from '../data/rooms';

export default function Home() {
  const navigate = useNavigate();
  const [destination, setDestination] = useState('');
  const [checkIn, setCheckIn] = useState('');
  const [checkOut, setCheckOut] = useState('');
  const [guests, setGuests] = useState('2');
  const [error, setError] = useState('');

  function search(e) {
    e.preventDefault();
    if (checkIn && checkOut && checkOut <= checkIn) {
      setError('Ngày trả phòng phải sau ngày nhận phòng.');
      return;
    }
    navigate(`/rooms?${new URLSearchParams({ destination, checkIn, checkOut, guests })}`);
  }

  return (
    <>
      {/* Hero Banner Section */}
      <section className="hero">
        <div className="hero-shade">
          <div className="container hero-content">
            <span className="eyebrow">CHÀO MỪNG ĐẾN VỚI VNHOTEL</span>
            <h1>
              Khám phá kỳ nghỉ
              <br />
              <em>tuyệt vời của bạn</em>
            </h1>
            <p>Hàng ngàn phòng khách sạn sang trọng với giá tốt đang chờ đón bạn.</p>
            <Link className="btn btn-light" to="/rooms">
              Khám phá phòng →
            </Link>
          </div>
        </div>
      </section>

      {/* Form Tìm Kiếm */}
      <section className="container search-wrap">
        <form className="search-panel" onSubmit={search}>
          <label>
            Địa điểm
            <input
              value={destination}
              onChange={(e) => setDestination(e.target.value)}
              placeholder="Bạn muốn đi đâu?"
            />
          </label>

          <label>
            Nhận phòng
            <input
              type="date"
              value={checkIn}
              onChange={(e) => setCheckIn(e.target.value)}
            />
          </label>

          <label>
            Trả phòng
            <input
              type="date"
              value={checkOut}
              onChange={(e) => setCheckOut(e.target.value)}
            />
          </label>

          <label>
            Số người
            <select
              value={guests}
              onChange={(e) => setGuests(e.target.value)}
            >
              <option value="1">1 người lớn</option>
              <option value="2">2 người lớn</option>
              <option value="3">3 người</option>
              <option value="4">Gia đình (4 người)</option>
            </select>
          </label>

          <button className="btn" type="submit">
            Tìm kiếm →
          </button>

          {error && <p className="form-error">{error}</p>}
        </form>
      </section>

      {/* Danh sách phòng nổi bật */}
      <section className="container section">
        <div className="section-heading">
          <div>
            <p className="eyebrow dark">LỰA CHỌN DÀNH CHO BẠN</p>
            <h2>Phòng nổi bật</h2>
          </div>
          <Link className="text-link" to="/rooms">
            Xem tất cả phòng →
          </Link>
        </div>

        <div className="rooms-grid">
          {rooms.slice(0, 3).map((room) => (
            <RoomCard key={room.id} room={room} />
          ))}
        </div>
      </section>

      {/* Giới thiệu ngắn về VNHotel */}
      <section className="about-strip">
        <div className="container about-grid">
          <img
            src="https://images.unsplash.com/photo-1564501049412-61c2a3083791?auto=format&fit=crop&w=1000&q=85"
            alt="Khách sạn sang trọng"
          />
          <div>
            <p className="eyebrow dark">VỀ CHÚNG TÔI</p>
            <h2>Trải nghiệm lưu trú đáng nhớ cùng VNHotel</h2>
            <p>
              VNHotel hướng đến việc kết nối du khách với những lựa chọn lưu trú phù hợp trên khắp Việt Nam, mang lại trải nghiệm tìm kiếm và đặt phòng thuận tiện.
            </p>
            <ul className="check-list">
              <li>✓ Giá hiển thị rõ ràng</li>
              <li>✓ Tìm kiếm phòng nhanh chóng</li>
              <li>✓ Giao diện đặt phòng dễ sử dụng</li>
            </ul>
            <Link className="btn" to="/about-us">
              Tìm hiểu thêm →
            </Link>
          </div>
        </div>
      </section>
    </>
  );
}