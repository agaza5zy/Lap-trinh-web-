import { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import RoomCard from '../components/RoomCard';
import { getRooms } from '../api/rooms';
import { vietnamDate } from '../utils/dates';

const HOTEL_CITY = 'Đà Lạt';

export default function Rooms() {
  const [params, setParams] = useSearchParams();
  const [checkIn, setCheckIn] = useState(params.get('checkIn') || vietnamDate(1));
  const [checkOut, setCheckOut] = useState(params.get('checkOut') || vietnamDate(2));
  const [guests, setGuests] = useState(params.get('guests') || '2');
  const [sort, setSort] = useState('recommended');
  const [rooms, setRooms] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const queryString = params.toString();

  useEffect(() => {
    const query = new URLSearchParams(queryString);
    const nextCheckIn = query.get('checkIn') || vietnamDate(1);
    const nextCheckOut = query.get('checkOut') || vietnamDate(2);
    const nextGuests = query.get('guests') || '2';
    setCheckIn(nextCheckIn);
    setCheckOut(nextCheckOut);
    setGuests(nextGuests);
    setLoading(true);
    setError('');
    getRooms({ destination: HOTEL_CITY, checkIn: nextCheckIn, checkOut: nextCheckOut, guests: nextGuests })
      .then((data) => setRooms(data.rooms))
      .catch((err) => setError(err.response?.data?.message || 'Không thể tải danh sách phòng.'))
      .finally(() => setLoading(false));
  }, [queryString]);

  const sorted = useMemo(() => [...rooms].sort((a, b) => sort === 'price-low' ? a.price - b.price : sort === 'price-high' ? b.price - a.price : b.availableRooms - a.availableRooms || a.price - b.price), [rooms, sort]);
  function apply(event) {
    event.preventDefault();
    if (!checkIn || !checkOut || checkOut <= checkIn) return setError('Ngày trả phòng phải sau ngày nhận phòng.');
    setParams({ destination: HOTEL_CITY, checkIn, checkOut, guests });
  }

  return <main className="container section">
    <div className="page-title-row"><div><span className="eyebrow dark">VNHOTEL ĐÀ LẠT</span><h1>Tìm phòng phù hợp cho kỳ nghỉ.</h1><p className="section-lead">Chọn ngày lưu trú để xem số lượng phòng còn trống thực tế tại khách sạn.</p></div><div className="page-title-note">✦ <strong>{rooms.length}</strong> hạng phòng</div></div>
    <form className="filter-panel" onSubmit={apply}>
      <label>Khách sạn<input value="VNHotel Đà Lạt" readOnly /></label>
      <label>Nhận phòng<input type="date" min={vietnamDate(0)} value={checkIn} onChange={(e) => setCheckIn(e.target.value)} required /></label>
      <label>Trả phòng<input type="date" min={checkIn} value={checkOut} onChange={(e) => setCheckOut(e.target.value)} required /></label>
      <label>Số khách<select value={guests} onChange={(e) => setGuests(e.target.value)}>{[1, 2, 3, 4, 5, 6].map((n) => <option key={n} value={n}>{n} khách</option>)}</select></label>
      <button className="btn" type="submit">Kiểm tra phòng ↗</button>
    </form>
    <div className="list-toolbar"><span>{loading ? 'Đang kiểm tra tình trạng phòng…' : `Hiển thị ${sorted.length} hạng phòng · ${checkIn} đến ${checkOut}`}</span><label>Sắp xếp <select value={sort} onChange={(e) => setSort(e.target.value)}><option value="recommended">Còn nhiều phòng trước</option><option value="price-low">Giá thấp đến cao</option><option value="price-high">Giá cao đến thấp</option></select></label></div>
    {error && <div className="alert alert-error">{error}</div>}
    {loading ? <div className="page-loader">Đang kiểm tra phòng khách sạn…</div> : sorted.length ? <div className="rooms-grid">{sorted.map((room) => <RoomCard key={room.id} room={room} checkIn={checkIn} checkOut={checkOut} guests={guests} />)}</div> : <div className="empty-state"><span>⌂</span><h3>Chưa có hạng phòng phù hợp</h3><p>Thử thay đổi ngày lưu trú hoặc số lượng khách.</p></div>}
  </main>;
}
