import { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import RoomCard from '../components/RoomCard';
import { getRooms } from '../api/rooms';

export default function Rooms() {
  const [params, setParams] = useSearchParams();
  const [destination, setDestination] = useState(params.get('destination') || '');
  const [checkIn, setCheckIn] = useState(params.get('checkIn') || '');
  const [checkOut, setCheckOut] = useState(params.get('checkOut') || '');
  const [guests, setGuests] = useState(params.get('guests') || '2');
  const [sort, setSort] = useState('recommended');
  const [rooms, setRooms] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    setLoading(true); setError('');
    getRooms({ destination: params.get('destination') || '', checkIn: params.get('checkIn') || '', checkOut: params.get('checkOut') || '', guests: params.get('guests') || '2' })
      .then((data) => setRooms(data.rooms))
      .catch((err) => setError(err.response?.data?.message || 'Không thể tải danh sách phòng.'))
      .finally(() => setLoading(false));
  }, [params]);

  const sorted = useMemo(() => [...rooms].sort((a, b) => sort === 'price-low' ? a.price - b.price : sort === 'price-high' ? b.price - a.price : b.stars - a.stars), [rooms, sort]);
  function apply(event) { event.preventDefault(); if (checkIn && checkOut && checkOut <= checkIn) return setError('Ngày trả phòng phải sau ngày nhận phòng.'); setParams({ destination, checkIn, checkOut, guests }); }

  return <main className="container section">
    <div className="page-title-row"><div><span className="eyebrow dark">KHÁM PHÁ VNHOTEL</span><h1>Tìm một nơi thật hợp với bạn.</h1><p className="section-lead">Những căn phòng được tuyển chọn cho chuyến đi tiếp theo.</p></div><div className="page-title-note">✦ <strong>{rooms.length}</strong> lựa chọn lưu trú</div></div>
    <form className="filter-panel" onSubmit={apply}>
      <label>Điểm đến<input value={destination} onChange={(e) => setDestination(e.target.value)} placeholder="Thành phố, khách sạn…" /></label>
      <label>Nhận phòng<input type="date" value={checkIn} onChange={(e) => setCheckIn(e.target.value)} /></label>
      <label>Trả phòng<input type="date" min={checkIn} value={checkOut} onChange={(e) => setCheckOut(e.target.value)} /></label>
      <label>Số khách<select value={guests} onChange={(e) => setGuests(e.target.value)}>{[1,2,3,4,5,6].map((n) => <option key={n} value={n}>{n} khách</option>)}</select></label>
      <button className="btn" type="submit">Cập nhật tìm kiếm ↗</button>
    </form>
    <div className="list-toolbar"><span>{loading ? 'Đang tìm kiếm…' : `Hiển thị ${sorted.length} loại phòng`}</span><label>Sắp xếp <select value={sort} onChange={(e) => setSort(e.target.value)}><option value="recommended">Đề xuất</option><option value="price-low">Giá thấp đến cao</option><option value="price-high">Giá cao đến thấp</option></select></label></div>
    {error && <div className="alert alert-error">{error}</div>}
    {loading ? <div className="page-loader">Đang tải phòng khách sạn…</div> : sorted.length ? <div className="rooms-grid">{sorted.map((room) => <RoomCard key={room.id} room={room} />)}</div> : <div className="empty-state"><span>⌂</span><h3>Chưa tìm thấy phòng phù hợp</h3><p>Thử thay đổi điểm đến hoặc ngày lưu trú của bạn.</p></div>}
  </main>;
}
