import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { cancelBooking, getMyBookings } from '../api/bookings';
import { money, dateLabel } from '../data/rooms';
import { useAuth } from '../context/AuthContext';

const statusLabel = { pending: 'Chờ thanh toán', confirmed: 'Đã xác nhận', checked_in: 'Đang lưu trú', checked_out: 'Đã hoàn tất', cancelled: 'Đã hủy' };
export default function Account() {
  const { user } = useAuth();
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const load = useCallback(async () => { setLoading(true); try { const data = await getMyBookings(); setBookings(data.bookings); } catch (err) { setError(err.response?.data?.message || 'Không tải được đơn đặt phòng.'); } finally { setLoading(false); } }, []);
  useEffect(() => { load(); }, [load]);
  async function cancel(id) { if (!window.confirm('Bạn có chắc muốn hủy đơn đặt phòng này?')) return; try { await cancelBooking(id); await load(); } catch (err) { setError(err.response?.data?.message || 'Không thể hủy đơn.'); } }
  return <main className="container section account-page"><div className="account-welcome"><div><span className="eyebrow dark">KHÔNG GIAN CỦA BẠN</span><h1>Xin chào, {user?.fullName?.split(' ').slice(-1)[0]}.</h1><p className="section-lead">Quản lý hành trình và những kỳ nghỉ sắp tới tại đây.</p></div><div className="account-avatar">{user?.fullName?.charAt(0)?.toUpperCase() || 'V'}</div></div>
    <div className="account-stats"><div><span>✦</span><small>Tổng đơn đặt phòng</small><strong>{bookings.length}</strong></div><div><span>◷</span><small>Đang chờ / xác nhận</small><strong>{bookings.filter((b) => ['pending', 'confirmed'].includes(b.status)).length}</strong></div><div><span>✓</span><small>Đã hoàn tất</small><strong>{bookings.filter((b) => b.status === 'checked_out').length}</strong></div></div>
    <div className="section-heading account-list-heading"><div><h2>Đơn đặt phòng của tôi</h2><p className="section-lead">Theo dõi trạng thái và thanh toán của từng đơn.</p></div><Link to="/rooms" className="btn">Đặt phòng mới ↗</Link></div>
    {error && <div className="alert alert-error">{error}</div>}
    {loading ? <div className="page-loader">Đang tải đơn đặt phòng…</div> : bookings.length ? <div className="booking-list">{bookings.map((booking) => <article className="booking-item" key={booking.id}><div className="booking-item-main"><span className={`status-pill status-${booking.status}`}>{statusLabel[booking.status] || booking.status}</span><h3>{booking.roomName}</h3><p>{booking.hotelName}</p><div className="booking-item-meta"><span>⌖ {dateLabel(booking.checkIn)} – {dateLabel(booking.checkOut)}</span><span>♙ {booking.guests || 1} khách</span><span>#{booking.code}</span></div></div><div className="booking-item-side"><strong>{money(booking.totalAmount)}</strong><small>Thanh toán: {booking.paymentStatus === 'paid' ? 'Đã thanh toán' : booking.paymentStatus === 'failed' ? 'Thất bại' : 'Chưa thanh toán'}</small>{booking.status === 'pending' && <Link to={`/checkout/${booking.code}`} className="btn btn-small">Thanh toán ↗</Link>}{['pending', 'confirmed'].includes(booking.status) && <button className="text-button danger-text" onClick={() => cancel(booking.id)}>Hủy đơn</button>}</div></article>)}</div> : <div className="empty-state"><span>⌂</span><h3>Chưa có hành trình nào</h3><p>Hãy khám phá những không gian nghỉ dưỡng tiếp theo của bạn.</p><Link to="/rooms" className="btn">Khám phá khách sạn ↗</Link></div>}
  </main>;
}
