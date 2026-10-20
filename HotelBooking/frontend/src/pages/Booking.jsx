import { useState } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { rooms, money } from '../data/rooms';

export default function Booking() {
  const [params] = useSearchParams();
  const [roomId, setRoomId] = useState(params.get('room') || '');
  const [submitted, setSubmitted] = useState(null);

  const room = rooms.find((r) => String(r.id) === roomId);

  function submit(e) {
    e.preventDefault();
    const data = new FormData(e.currentTarget);
    const start = data.get('checkIn');
    const end = data.get('checkOut');

    if (end <= start) {
      setSubmitted({ error: 'Ngày trả phòng phải sau ngày nhận phòng.' });
      return;
    }

    setSubmitted({
      name: data.get('name'),
      room: room?.name || 'Chưa chọn phòng'
    });
  }

  return (
    <main className="container section">
      <p className="eyebrow dark">LÊN KẾ HOẠCH CHUYẾN ĐI</p>
      <h1>Đặt phòng khách sạn</h1>
      <p className="muted page-intro">
        Điền thông tin bên dưới để xem minh họa quy trình đặt phòng.
      </p>

      <div className="booking-layout">
        {/* Form Đặt phòng */}
        <form className="booking-form stack-form" onSubmit={submit}>
          <label>
            Phòng
            <select
              required
              value={roomId}
              onChange={(e) => setRoomId(e.target.value)}
            >
              <option value="">Chọn phòng</option>
              {rooms.map((r) => (
                <option key={r.id} value={r.id}>
                  {r.name} — {money(r.price)}/đêm
                </option>
              ))}
            </select>
          </label>

          <label>
            Họ và tên
            <input name="name" required placeholder="Nguyễn Văn A" />
          </label>

          <label>
            Email
            <input
              name="email"
              type="email"
              required
              placeholder="email@example.com"
            />
          </label>

          <label>
            Số điện thoại
            <input
              name="phone"
              type="tel"
              required
              placeholder="Số điện thoại"
            />
          </label>

          <div className="two-col">
            <label>
              Ngày nhận phòng
              <input name="checkIn" type="date" required />
            </label>
            <label>
              Ngày trả phòng
              <input name="checkOut" type="date" required />
            </label>
          </div>

          <label>
            Ghi chú
            <textarea
              name="note"
              rows="3"
              placeholder="Yêu cầu thêm (nếu có)"
            />
          </label>

          <button className="btn" type="submit">
            Gửi yêu cầu đặt phòng
          </button>

          {submitted && (
            <p
              className={submitted.error ? 'form-error' : 'form-success'}
              role="status"
            >
              {submitted.error ||
                `Đã ghi nhận thông tin minh họa của ${submitted.name} cho ${submitted.room}. Chưa có đơn đặt phòng thực tế được lưu.`}
            </p>
          )}
        </form>

        {/* Sidebar xem trước thông tin phòng */}
        <aside className="booking-aside">
          <h3>Thông tin đặt phòng</h3>
          {room ? (
            <>
              <img src={room.image} alt={room.name} />
              <h4>{room.name}</h4>
              <p className="muted">{room.location}</p>
              <p>
                <strong className="price">{money(room.price)}</strong> / đêm
              </p>
            </>
          ) : (
            <p className="muted">Hãy chọn phòng để xem thông tin.</p>
          )}
          <Link to="/rooms" className="text-link">
            Xem các phòng →
          </Link>
        </aside>
      </div>
    </main>
  );
}