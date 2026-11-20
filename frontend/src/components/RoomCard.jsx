import { Link } from 'react-router-dom';
import { money } from '../data/rooms';

export default function RoomCard({ room, checkIn = '', checkOut = '', guests = 2 }) {
  const query = new URLSearchParams();
  if (checkIn) query.set('checkIn', checkIn);
  if (checkOut) query.set('checkOut', checkOut);
  if (guests) query.set('guests', String(guests));
  const suffix = query.toString() ? `?${query}` : '';
  const available = Number(room.availableRooms || 0);
  return <article className="room-card">
    <Link to={`/rooms/${room.id}${suffix}`} className="room-photo-link">
      <div className="room-photo">
        <img src={room.image || 'https://images.unsplash.com/photo-1611892440504-42a792e24d32?auto=format&fit=crop&w=1200&q=85'} alt={room.name} loading="lazy" />
        <span className="room-tag">{room.stars || 4} ★ · {room.location || 'Đà Lạt'}</span>
        <span className={`room-availability ${available > 0 ? 'is-available' : 'is-full'}`}>{available > 0 ? `Còn ${available} phòng` : 'Hết phòng'}</span>
      </div>
    </Link>
    <div className="room-card-body">
      <div className="room-meta"><span>⌖ {room.hotelName || 'VNHotel Đà Lạt'}</span><span>{room.area || '—'} m²</span></div>
      <h3>{room.name}</h3>
      <div className="room-features">{(room.amenities || []).slice(0, 3).map((amenity) => <span key={amenity}>{amenity}</span>)}</div>
      <div className="room-card-bottom"><div><strong className="price">{money(room.price)}</strong><span className="muted"> / đêm</span></div><Link className="text-link" to={`/rooms/${room.id}${suffix}`}>Xem phòng ↗</Link></div>
    </div>
  </article>;
}
