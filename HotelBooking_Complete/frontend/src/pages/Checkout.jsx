import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { createPayment, getPaymentConfig } from '../api/payments';
import { getMyBookings } from '../api/bookings';
import { money } from '../data/rooms';

const methodIcon = { bank_transfer: '▦', momo: 'M', paypal: 'P', zalopay: 'Z' };

export default function Checkout() {
  const { bookingCode } = useParams();
  const [config, setConfig] = useState(null);
  const [booking, setBooking] = useState(null);
  const [method, setMethod] = useState('bank_transfer');
  const [payment, setPayment] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  useEffect(() => {
    getPaymentConfig().then((data) => { setConfig(data); const first = data.methods.find((m) => m.enabled); if (first) setMethod(first.id); }).catch(() => setError('Không tải được cấu hình thanh toán.'));
    getMyBookings().then((data) => setBooking(data.bookings.find((item) => item.code === bookingCode) || null)).catch(() => {});
  }, [bookingCode]);

  async function pay(event) {
    event.preventDefault(); setError(''); setPayment(null);
    try {
      setLoading(true);
      const result = await createPayment(bookingCode, method);
      setPayment(result);
      if (result.redirectUrl && method !== 'bank_transfer') window.location.assign(result.redirectUrl);
    } catch (err) { setError(err.response?.data?.message || 'Không thể khởi tạo thanh toán.'); }
    finally { setLoading(false); }
  }

  return <main className="container section checkout-page">
    <div className="checkout-heading"><span className="eyebrow dark">THANH TOÁN AN TOÀN</span><h1>Hoàn tất kỳ nghỉ của bạn.</h1><p className="section-lead">Mã đặt phòng <strong>{bookingCode}</strong>. Chọn phương thức thanh toán phù hợp.</p></div>
    <div className="checkout-layout"><section className="booking-form"><form onSubmit={pay}><h3>Chọn phương thức thanh toán</h3><div className="payment-methods">{(config?.methods || []).map((item) => <label className={`payment-method ${method === item.id ? 'selected' : ''} ${!item.enabled ? 'disabled' : ''}`} key={item.id}><input type="radio" name="payment" value={item.id} disabled={!item.enabled} checked={method === item.id} onChange={() => { setMethod(item.id); setPayment(null); }} /><span className={`payment-icon icon-${item.id}`}>{methodIcon[item.id]}</span><span className="payment-label"><strong>{item.label}</strong><small>{item.description}</small>{!item.enabled && <em>Chưa cấu hình merchant</em>}</span><span className="radio-dot" /></label>)}</div>
      {error && <div className="alert alert-error">{error}</div>}
      <button type="submit" className="btn btn-wide" disabled={loading || !config?.methods?.some((m) => m.id === method && m.enabled)}>{loading ? 'Đang kết nối cổng thanh toán…' : 'Tiếp tục thanh toán ↗'}</button>
      <p className="form-footnote">VNHotel không lưu thông tin thẻ hoặc mật khẩu ví điện tử. Kết quả thanh toán được xác nhận từ máy chủ của nhà cung cấp.</p>
    </form></section>
    <aside className="booking-aside"><div className="secure-badge">♧ THANH TOÁN ĐƯỢC BẢO VỆ</div><h3>Thông tin đơn đặt phòng</h3>{booking && <div className="checkout-booking-summary"><strong>{booking.roomName}</strong><span>{booking.hotelName}</span><span>{booking.checkIn} – {booking.checkOut}</span><b>{money(booking.totalAmount)}</b></div>}{payment?.provider === 'bank_transfer' && <div className="qr-payment"><img src={payment.qrUrl} alt="Mã QR chuyển khoản ngân hàng" /><strong>{money(payment.amount)}</strong><div className="bank-detail"><span>Ngân hàng</span><b>{payment.bank.name}</b><span>Số tài khoản</span><b>{payment.bank.accountNo}</b><span>Chủ tài khoản</span><b>{payment.bank.accountName}</b><span>Nội dung chuyển khoản</span><b>{payment.transferContent}</b></div><button type="button" className="btn btn-outline btn-wide" onClick={() => navigator.clipboard.writeText(payment.transferContent)}>Sao chép nội dung chuyển khoản</button>{payment.demoMode && <div className="alert alert-info">Đây là tài khoản QR DEMO. Thay BANK_BIN, BANK_ACCOUNT_NO và BANK_ACCOUNT_NAME trong backend/.env trước khi nhận tiền thật.</div>}<div className="alert alert-info">{payment.note}</div></div>}{payment?.provider && payment.provider !== 'bank_transfer' && <div className="alert alert-info">Đang chuyển đến cổng {payment.provider}. Nếu cửa sổ thanh toán không mở, hãy thử lại.</div>}{!payment && <div className="payment-empty"><span>▦</span><strong>Chọn một phương thức</strong><p>Mã QR hoặc liên kết thanh toán sẽ xuất hiện sau khi bạn tiếp tục.</p></div>}<Link to="/account" className="text-link">Xem đơn đặt phòng của tôi ↗</Link></aside></div>
  </main>;
}
