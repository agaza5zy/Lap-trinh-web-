import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import SocialLoginButtons from '../components/SocialLoginButtons';

export default function Register() {
  const { register } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({ fullName: '', email: '', password: '', confirmPassword: '' });
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [devUrl, setDevUrl] = useState('');
  const [loading, setLoading] = useState(false);
  function change(event) { setForm((old) => ({ ...old, [event.target.name]: event.target.value })); }
  async function submit(event) {
    event.preventDefault(); setError(''); setMessage('');
    if (!/^[^\s@]+@gmail\.com$/i.test(form.email)) return setError('Vui lòng sử dụng địa chỉ Gmail (@gmail.com).');
    if (form.password.length < 8 || !/[A-Za-z]/.test(form.password) || !/\d/.test(form.password)) return setError('Mật khẩu cần ít nhất 8 ký tự, gồm chữ cái và chữ số.');
    if (form.password !== form.confirmPassword) return setError('Mật khẩu xác nhận không khớp.');
    try { setLoading(true); const result = await register({ fullName: form.fullName, email: form.email, password: form.password }); if (result.token) { navigate('/account'); return; } setMessage(result.message || 'Vui lòng kiểm tra Gmail để xác minh tài khoản.'); setDevUrl(result.devVerificationUrl || ''); if (result.devVerificationToken) sessionStorage.setItem('vnhotel-dev-verification-token', result.devVerificationToken); }
    catch (err) { setError(err.response?.data?.message || 'Không thể tạo tài khoản.'); }
    finally { setLoading(false); }
  }
  return <main className="auth-layout"><div className="auth-visual register-visual"><div className="auth-visual-copy"><span className="eyebrow">YOUR NEXT CHAPTER</span><h2>Đi đâu cũng được. Miễn là có một nơi để trở về.</h2><p>Tạo tài khoản VNHotel để lưu hành trình, quản lý đơn đặt phòng và tận hưởng trải nghiệm liền mạch.</p><div className="auth-mini-stats"><span><b>01</b> Đặt phòng dễ dàng</span><span><b>02</b> Thanh toán linh hoạt</span><span><b>03</b> Theo dõi mọi lúc</span></div></div></div><div className="auth-panel"><div className="auth-card"><Link to="/" className="auth-brand">✦ VNHotel</Link><span className="eyebrow dark">BẮT ĐẦU HÀNH TRÌNH</span><h1>Tạo tài khoản mới</h1><p className="muted">Chỉ mất một phút để bắt đầu.</p>{error && <div className="alert alert-error">{error}</div>}{message && <div className="alert alert-success">{message}{devUrl && <p><Link to={devUrl.replace(window.location.origin, '')}>Xác minh email trong môi trường phát triển ↗</Link></p>}</div>}<form className="stack-form" onSubmit={submit}><label>Họ và tên<input name="fullName" required value={form.fullName} onChange={change} placeholder="Nguyễn Văn An" /></label><label>Địa chỉ Gmail<input name="email" type="email" required autoComplete="email" value={form.email} onChange={change} placeholder="ban@gmail.com" /></label><label>Mật khẩu<input name="password" type="password" required autoComplete="new-password" value={form.password} onChange={change} placeholder="Ít nhất 8 ký tự, có chữ và số" /></label><label>Nhập lại mật khẩu<input name="confirmPassword" type="password" required autoComplete="new-password" value={form.confirmPassword} onChange={change} placeholder="Nhập lại mật khẩu" /></label><button className="btn btn-wide" type="submit" disabled={loading}>{loading ? 'Đang tạo tài khoản…' : 'Đăng ký & xác minh Gmail ↗'}</button></form><div className="auth-divider"><span>hoặc đăng ký với</span></div><SocialLoginButtons onError={setError} /><p className="auth-switch">Đã có tài khoản? <Link to="/login">Đăng nhập</Link></p></div></div></main>;
}
