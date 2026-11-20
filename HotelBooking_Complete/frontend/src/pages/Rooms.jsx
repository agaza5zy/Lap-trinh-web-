import { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import RoomCard from '../components/RoomCard';
import { getRooms } from '../api/rooms';

const today = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Ho_Chi_Minh', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date());

function addDays(value, days) {
  const date = new Date(`${value}T00:00:00.000Z`);
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}

export default function Rooms() {
  const [params, setParams] = useSearchParams();
  const [destination, setDestination] = useState(params.get('destination') || '');
  const [checkIn, setCheckIn] = useState(params.get('checkIn') || '');
  const [checkOut, setCheckOut] = useState(params.get('checkOut') || '');
  const [guests, setGuests] = useState(params.get('guests') || '2');
  const [sort, setSort] = useState('recommended');
  const [rooms, setRooms] = useState([]);
  const [availabilityChecked, setAvailabilityChecked] = useState(Boolean(params.get('checkIn') && params.get('checkOut')));
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    setDestination(params.get('destination') || '');
    setCheckIn(params.get('checkIn') || '');
    setCheckOut(params.get('checkOut') || '');
    setGuests(params.get('guests') || '2');
    setLoading(true);
    setError('');
    setRooms([]);
    setAvailabilityChecked(false);
    getRooms({
      destination: params.get('destination') || '',
      checkIn: params.get('checkIn') || '',
      checkOut: params.get('checkOut') || '',
      guests: params.get('guests') || '2',
    })
      .then((data) => {
        setRooms(data.rooms || []);
        setAvailabilityChecked(Boolean(data.availabilityChecked));
      })
      .catch((err) => setError(err.response?.data?.message || 'Không thể tải danh sách phòng.'))
      .finally(() => setLoading(false));
  }, [params]);

  const sorted = useMemo(() => [...rooms].sort((a, b) => (
    sort === 'price-low' ? a.price - b.price
      : sort === 'price-high' ? b.price - a.price
        : b.stars - a.stars
  )), [rooms, sort]);

  function apply(event) {
    event.preventDefault();
    setError('');
    if (Boolean(checkIn) !== Boolean(checkOut)) return setError('Vui lòng chọn cả ngày nhận phòng và ngày trả phòng.');
    if (checkIn && checkIn < today) return setError('Ngày nhận phòng không thể nằm trong quá khứ.');
    if (checkIn && checkOut <= checkIn) return setError('Ngày trả phòng phải sau ngày nhận phòng.');
    setParams({ destination, checkIn, checkOut, guests });
  }

  return <main className="container section">
    <div className="page-title-row"><div><span className="eyebrow dark">KHÁM PHÁ VNHOTEL</span><h1>Tìm một nơi thật hợp với bạn.</h1><p className="section-lead">Những căn phòng được tuyển chọn cho chuyến đi tiếp theo.</p></div><div className="page-title-note">✦ <strong>{rooms.length}</strong> lựa chọn lưu trú</div></div>
    <form className="filter-panel" onSubmit={apply}>
      <label>Điểm đến<input value={destination} onChange={(e) => setDestination(e.target.value)} placeholder="Thành phố, khách sạn…" /></label>
      <label>Nhận phòng<input type="date" min={today} value={checkIn} onChange={(e) => { const nextCheckIn = e.target.value; setCheckIn(nextCheckIn); if (checkOut && checkOut <= nextCheckIn) setCheckOut(addDays(nextCheckIn, 1)); }} /></label>
      <label>Trả phòng<input type="date" min={checkIn || today} value={checkOut} onChange={(e) => setCheckOut(e.target.value)} /></label>
      <label>Số khách<select value={guests} onChange={(e) => setGuests(e.target.value)}>{[1, 2, 3, 4, 5, 6].map((n) => <option key={n} value={n}>{n} khách</option>)}</select></label>
      <button className="btn" type="submit">Kiểm tra phòng trống ↗</button>
    </form>
    <div className="list-toolbar">
      <span>{loading ? 'Đang tìm kiếm…' : availabilityChecked ? `Tình trạng phòng theo ngày đã chọn · ${sorted.length} loại phòng` : `Hiển thị ${sorted.length} loại phòng · chọn ngày để kiểm tra lịch trống`}</span>
      <label>Sắp xếp <select value={sort} onChange={(e) => setSort(e.target.value)}><option value="recommended">Đề xuất</option><option value="price-low">Giá thấp đến cao</option><option value="price-high">Giá cao đến thấp</option></select></label>
    </div>
    {error && <div className="alert alert-error">{error}</div>}
    {loading ? <div className="page-loader">Đang tải phòng khách sạn…</div> : sorted.length ? <div className="rooms-grid">{sorted.map((room) => <RoomCard key={room.id} room={room} searchParams={{ destination, checkIn, checkOut, guests }} />)}</div> : <div className="empty-state"><span>⌂</span><h3>Chưa tìm thấy phòng phù hợp</h3><p>Thử thay đổi điểm đến hoặc ngày lưu trú của bạn.</p></div>}
  </main>;
}
