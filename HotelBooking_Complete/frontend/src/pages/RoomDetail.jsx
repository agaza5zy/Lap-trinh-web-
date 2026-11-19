import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { getRoom } from '../api/rooms';
import { money } from '../data/rooms';

export default function RoomDetail() {
  const { id } = useParams();
  const [room, setRoom] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  useEffect(() => { getRoom(id).then((data) => setRoom(data.room)).catch((err) => setError(err.response?.data?.message || 'Không tìm thấy phòng.')).finally(() => setLoading(false)); }, [id]);
  if (loading) return <div className="page-loader">Đang tải thông tin phòng…</div>;
  if (!room) return <main className="container section"><div className="empty-state"><h2>{error || 'Không tìm thấy phòng'}</h2><Link to="/rooms" className="btn">Quay lại danh sách phòng</Link></div></main>;
  return <main className="container section detail-page">
    <Link className="back-link" to="/rooms">← Quay lại danh sách</Link>
    <div className="detail-gallery"><img className="detail-main-photo" src={room.image} alt={room.name} /><div className="detail-side-photos"><img src={room.images?.[1] || room.image} alt="Không gian phòng" /><div className="detail-photo-note"><span>{room.stars} ★</span><strong>{room.hotelName}</strong><small>{room.address}, {room.location}</small></div></div></div>
    <div className="detail-layout"><section className="detail-info"><span className="eyebrow dark">{room.hotelName} · {room.location}</span><h1>{room.name}</h1><p className="section-lead">{room.description}</p><div className="detail-facts"><span>▣ {room.area} m²</span><span>♙ Tối đa {room.capacity} khách</span><span>▤ {room.bedType || 'Giường tiêu chuẩn'}</span></div><h3>Tiện nghi trong phòng</h3><div className="amenities-grid">{room.amenities.map((item) => <span key={item}>✓ {item}</span>)}</div><div className="detail-description"><h3>Về không gian này</h3><p>Được chăm chút để mang đến cảm giác thoải mái trong suốt kỳ nghỉ. Vui lòng chọn ngày lưu trú để hệ thống kiểm tra tình trạng phòng thực tế trước khi xác nhận.</p></div></section>
      <aside className="booking-aside detail-booking-card"><div className="price-line"><strong>{money(room.price)}</strong><span>/ đêm</span></div><div className="availability-note"><span className="availability-dot" /> {room.availableRooms} phòng đang mở bán</div><p className="muted">Giá cuối cùng được tính theo số đêm và xác nhận ở bước đặt phòng.</p><Link to={`/booking?room=${room.id}`} className="btn btn-wide">Đặt phòng này ↗</Link><div className="secure-note">♧ Thanh toán bảo mật · Hỗ trợ nhiều phương thức</div></aside></div>
  </main>;
}
