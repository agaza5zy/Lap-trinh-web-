import { Link } from 'react-router-dom';

export default function About() {
  return (
    <main className="container section about-page">
      <p className="eyebrow dark">TÌM HIỂU VỀ CHÚNG TÔI</p>
      <h1>Về VNHotel</h1>

      <div className="about-grid">
        <img
          src="https://images.unsplash.com/photo-1564501049412-61c2a3083791?auto=format&fit=crop&w=1000&q=85"
          alt="Không gian khách sạn"
        />

        <div>
          <h2>Đặt phòng dễ dàng, tận hưởng trọn vẹn</h2>
          <p>
            VNHotel là dự án website quản lý và đặt phòng khách sạn trực tuyến,
            được xây dựng nhằm giúp khách hàng tìm kiếm phòng, xem thông tin chi
            tiết và gửi yêu cầu đặt phòng thuận tiện.
          </p>
          <p>
            Hệ thống định hướng phục vụ cả khách hàng và người quản trị khách
            sạn.
          </p>

          <Link className="btn" to="/rooms">
            Khám phá phòng
          </Link>
        </div>
      </div>
    </main>
  );
}