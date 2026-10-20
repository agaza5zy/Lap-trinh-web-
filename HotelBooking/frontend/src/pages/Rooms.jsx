import { useSearchParams } from 'react-router-dom';
import { useState } from 'react';
import RoomCard from '../components/RoomCard';
import { rooms } from '../data/rooms';

export default function Rooms() {
  const [params] = useSearchParams();
  const [location, setLocation] = useState(params.get('destination') || '');
  const [type, setType] = useState('');

  const guests = Number(params.get('guests') || 0);

  // Lọc danh sách phòng theo địa điểm, loại phòng và sức chứa
  const filtered = rooms.filter(
    (r) =>
      r.location.toLowerCase().includes(location.trim().toLowerCase()) &&
      (!type || r.type === type) &&
      r.capacity >= guests
  );

  return (
    <main className="container section">
      <p className="eyebrow dark">KHÁM PHÁ VNHOTEL</p>
      <h1>Danh sách phòng khách sạn</h1>
      <p className="muted page-intro">
        Tìm kiếm và lựa chọn phòng phù hợp cho chuyến đi của bạn.
      </p>

      {/* Thanh lọc tìm kiếm */}
      <div className="filter-bar">
        <label>
          Địa điểm
          <input
            value={location}
            onChange={(e) => setLocation(e.target.value)}
            placeholder="Đà Nẵng, Hà Nội..."
          />
        </label>

        <label>
          Loại phòng
          <select value={type} onChange={(e) => setType(e.target.value)}>
            <option value="">Tất cả loại phòng</option>
            {[...new Set(rooms.map((r) => r.type))].map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </select>
        </label>

        <span className="muted">{filtered.length} phòng phù hợp</span>
      </div>

      {/* Lưới danh sách phòng */}
      <div className="rooms-grid">
        {filtered.map((r) => (
          <RoomCard key={r.id} room={r} />
        ))}
      </div>

      {/* Trạng thái trống khi không tìm thấy kết quả */}
      {filtered.length === 0 && (
        <div className="empty-state">
          Không tìm thấy phòng phù hợp. Hãy thử tìm địa điểm khác.
        </div>
      )}
    </main>
  );
}