import { Link, useParams } from 'react-router-dom';
import { rooms, money } from '../data/rooms';

export default function RoomDetail() {
  const { id } = useParams();
  const room = rooms.find((r) => String(r.id) === id);

  if (!room) {
    return (
      <main className="container section">
        <h1>Không tìm thấy phòng</h1>
        <Link to="/rooms">← Xem danh sách phòng</Link>
      </main>
    );
  }

  return (
    <main className="container section">
      <Link className="text-link" to="/rooms">
        ← Quay lại danh sách phòng
      </Link>

      <div className="detail-layout">
        {/* Hình ảnh phòng */}
        <img className="detail-photo" src={room.image} alt={room.name} />

        {/* Thông tin chi tiết */}
        <div className="detail-info">
          <span className="room-tag static-tag">{room.type}</span>
          <h1>{room.name}</h1>
          <p className="muted">⌖ {room.location}</p>
          <p>{room.description}</p>
          
          <p>
            Diện tích: {room.area} m² · Sức chứa: {room.capacity} khách
          </p>

          <h3>Tiện nghi</h3>
          <ul className="check-list">
            {room.amenities.map((a) => (
              <li key={a}>✓ {a}</li>
            ))}
          </ul>

          <p>
            <strong className="price price-large">{money(room.price)}</strong> / đêm
          </p>

          <Link className="btn" to={`/booking?room=${room.id}`}>
            Đặt phòng này →
          </Link>
        </div>
      </div>
    </main>
  );
}