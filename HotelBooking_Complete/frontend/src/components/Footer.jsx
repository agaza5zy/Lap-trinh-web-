import { Link } from 'react-router-dom';
export default function Footer() {
  return <footer className="site-footer">
    <div className="container footer-grid">
      <div><Link to="/" className="footer-brand">✦ VNHotel</Link><p>Không chỉ là một nơi lưu trú. Đó là điểm bắt đầu cho những hành trình đáng nhớ.</p><span className="footer-pill">Đặt phòng an tâm · Nghỉ dưỡng trọn vẹn</span></div>
      <div><h4>Khám phá</h4><Link to="/rooms">Tìm khách sạn</Link><Link to="/about">Câu chuyện VNHotel</Link><Link to="/account">Đơn đặt phòng</Link></div>
      <div><h4>Hỗ trợ</h4><a href="mailto:support@vnhotel.vn">support@vnhotel.vn</a><a href="tel:19001000">1900 1000</a><span>Hỗ trợ mỗi ngày · 08:00–22:00</span></div>
    </div>
    <div className="footer-bottom">© {new Date().getFullYear()} VNHotel. Nền tảng đặt phòng khách sạn.</div>
  </footer>;
}
