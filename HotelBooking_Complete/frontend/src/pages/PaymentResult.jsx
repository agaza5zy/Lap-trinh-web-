import { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { capturePayPal, getPaymentStatus } from '../api/payments';
import { money } from '../data/rooms';

export default function PaymentResult() {
  const [params] = useSearchParams();
  const provider = params.get('provider');
  const bookingCode = params.get('booking') || '';
  const paypalOrderId = params.get('token') || '';
  const [status, setStatus] = useState('checking');
  const [message, setMessage] = useState('Đang xác nhận kết quả giao dịch…');
  const [payment, setPayment] = useState(null);
  const [error, setError] = useState('');
  useEffect(() => {
    let alive = true;
    async function run() {
      try {
        if (provider === 'paypal' && paypalOrderId) {
          const result = await capturePayPal(paypalOrderId, bookingCode);
          if (!alive) return;
          setStatus('paid'); setMessage(result.message || 'Thanh toán PayPal thành công.'); return;
        }
        const result = await getPaymentStatus(bookingCode);
        if (!alive) return;
        setPayment(result.payment);
        if (result.payment.status === 'paid') { setStatus('paid'); setMessage('Thanh toán đã được xác nhận. Cảm ơn bạn đã đặt phòng tại VNHotel.'); }
        else { setStatus('pending'); setMessage('Cổng thanh toán đang xử lý hoặc chưa gửi xác nhận về hệ thống.'); }
      } catch (err) {
        if (!alive) return;
        setStatus('pending'); setError(err.response?.data?.message || 'Chưa thể xác nhận giao dịch tự động.'); setMessage('Vui lòng kiểm tra trạng thái đơn trong tài khoản sau ít phút.');
      }
    }
    run(); return () => { alive = false; };
  }, [provider, paypalOrderId, bookingCode]);
  async function refresh() { setError(''); try { const result = await getPaymentStatus(bookingCode); setPayment(result.payment); setStatus(result.payment.status === 'paid' ? 'paid' : 'pending'); setMessage(result.payment.status === 'paid' ? 'Thanh toán đã được xác nhận.' : 'Giao dịch vẫn đang chờ xác nhận.'); } catch (err) { setError(err.response?.data?.message || 'Không kiểm tra được trạng thái.'); } }
  return <main className="auth-page"><div className="auth-card payment-result-card"><div className={`result-icon ${status === 'paid' ? 'success' : ''}`}>{status === 'paid' ? '✓' : '◷'}</div><span className="eyebrow dark">KẾT QUẢ THANH TOÁN</span><h1>{status === 'paid' ? 'Đặt phòng thành công!' : 'Đang chờ xác nhận'}</h1><p className="muted">{message}</p><div className="result-reference"><span>Mã đặt phòng</span><strong>{bookingCode || '—'}</strong>{payment && <><span>Số tiền</span><strong>{money(payment.amount)}</strong><span>Phương thức</span><strong>{payment.provider}</strong></>}</div>{error && <div className="alert alert-info">{error}</div>}{status !== 'paid' && <button className="btn btn-outline btn-wide" onClick={refresh}>Kiểm tra trạng thái giao dịch</button>}<Link to="/account" className="btn btn-wide">Đến đơn đặt phòng của tôi ↗</Link><Link to="/" className="text-link">Về trang chủ</Link></div></main>;
}
