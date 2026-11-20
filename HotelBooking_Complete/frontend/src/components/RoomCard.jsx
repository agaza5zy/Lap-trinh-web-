import { Link } from 'react-router-dom';
import { money } from '../data/rooms';

export default function RoomCard({ room, searchParams = {} }) {
  const query = new URLSearchParams(
    Object.entries(searchParams).filter(([, value]) => value !== undefined && value !== null && String(value).trim() !== ''),
  ).toString();
  const detailUrl = `/rooms/${room.id}${query ? `?${query}` : ''}`;
  const hasAvailability = room.availabilityChecked === true;
  const availableRooms = Number(room.availableRooms || 0);
  const totalRooms = Number(room.totalRooms ?? room.availableRooms ?? 0);

  return <article className="room-card">
    <Link to={detailUrl} className="room-photo-link">
      <div className="room-photo">
        <img src={room.image || 'https://images.unsplash.com/photo-1611892440504-42a792e24d32?auto=format&fit=crop&w=1200&q=85'} alt={room.name} loading="lazy" />
        <span className="room-tag">{room.stars || 4} ★ · {room.location}</span>
      </div>
    </Link>
    <div className="room-card-body">
      <div className="room-meta"><span>⌖ {room.hotelName || room.location}</span><span>{room.area || '—'} m²</span></div>
      <h3>{room.name}</h3>
      <div className="room-features">{(room.amenities || []).slice(0, 3).map((amenity) => <span key={amenity}>{amenity}</span>)}</div>
      <div className={`room-availability ${hasAvailability && availableRooms === 0 ? 'is-unavailable' : 'is-available'}`}>
        <span className="availability-dot" />
        {hasAvailability
          ? availableRooms > 0 ? `Còn ${availableRooms} phòng trong ngày đã chọn` : 'Hết phòng trong ngày đã chọn'
          : totalRooms > 0 ? `${totalRooms} phòng đang mở bán · chọn ngày để kiểm tra` : 'Chưa có phòng sẵn sàng mở bán'}
      </div>
      <div className="room-card-bottom"><div><strong className="price">{money(room.price)}</strong><span className="muted"> / đêm</span></div><Link className="text-link" to={detailUrl}>Xem phòng ↗</Link></div>
    </div>
  </article>;
}
