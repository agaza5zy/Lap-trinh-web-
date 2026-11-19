import { useCallback, useEffect, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { resendVerificationApi } from '../api/auth';

export default function VerifyEmail() {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const { verifyEmail } = useAuth();
  const [token, setToken] = useState(params.get('token') || sessionStorage.getItem('vnhotel-dev-verification-token') || '');
  const [email, setEmail] = useState('');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const confirm = useCallback(async (value = token) => { setError(''); setMessage(''); try { setLoading(true); await verifyEmail(value); sessionStorage.removeItem('vnhotel-dev-verification-token'); setMessage('Email đã được xác minh. Đang chuyển đến tài khoản…'); setTimeout(() => navigate('/account'), 900); } catch (err) { setError(err.response?.data?.message || 'Không thể xác minh email.'); } finally { setLoading(false); } }, [navigate, token, verifyEmail]);
  const urlToken = params.get('token');
  useEffect(() => { if (urlToken) confirm(urlToken); }, [urlToken, confirm]);
  async function resend() { setError(''); try { const result = await resendVerificationApi(email); setMessage(result.message + (result.devVerificationToken ? ` Mã thử nghiệm: ${result.devVerificationToken}` : '')); } catch (err) { setError(err.response?.data?.message || 'Không thể gửi lại email.'); } }
  return <main className="auth-page"><div className="auth-card verify-card"><div className="verify-icon">✉</div><span className="eyebrow dark">XÁC MINH TÀI KHOẢN</span><h1>Kiểm tra hộp thư Gmail</h1><p className="muted">Mở liên kết xác minh được gửi đến địa chỉ email của bạn. Liên kết có hiệu lực trong 30 phút.</p>{error && <div className="alert alert-error">{error}</div>}{message && <div className="alert alert-success">{message}</div>}<label>Mã xác minh / token<input value={token} onChange={(e) => setToken(e.target.value)} placeholder="Dán token xác minh tại đây" /></label><button className="btn btn-wide" disabled={!token || loading} onClick={() => confirm()}>{loading ? 'Đang xác minh…' : 'Xác minh email'}</button><div className="auth-divider"><span>không nhận được email?</span></div><label>Gmail đăng ký<input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="ban@gmail.com" /></label><button className="btn btn-outline btn-wide" onClick={resend} disabled={!email}>Gửi lại hướng dẫn</button><Link to="/login" className="text-link verify-back">Quay lại đăng nhập</Link></div></main>;
}
