import { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import SocialLoginButtons from '../components/SocialLoginButtons';

export default function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  async function submit(event) {
    event.preventDefault(); setError('');
    try { setLoading(true); const user = await login({ email, password }); navigate(location.state?.from ? `${location.state.from.pathname}${location.state.from.search || ''}` : (['admin', 'staff'].includes(user.role) ? '/admin' : '/account'), { replace: true }); }
    catch (err) { setError(err.response?.data?.message || 'Đăng nhập không thành công.'); }
    finally { setLoading(false); }
  }
  return <main className="auth-layout"><div className="auth-visual"><div className="auth-visual-copy"><span className="eyebrow">WELCOME BACK</span><h2>Hành trình của bạn vẫn đang chờ.</h2><p>Đăng nhập để quản lý đặt phòng, lưu lại những lựa chọn yêu thích và tiếp tục khám phá.</p><span className="auth-quote">“Travel is the only thing you buy that makes you richer.”</span></div></div><div className="auth-panel"><div className="auth-card"><Link to="/" className="auth-brand">✦ VNHotel</Link><span className="eyebrow dark">TÀI KHOẢN CỦA BẠN</span><h1>Chào mừng trở lại</h1><p className="muted">Đăng nhập để tiếp tục với VNHotel.</p>{error && <div className="alert alert-error">{error}</div>}<form className="stack-form" onSubmit={submit}><label>Địa chỉ Gmail<input type="email" required autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="ban@gmail.com" /></label><label>Mật khẩu<input type="password" required autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Nhập mật khẩu" /></label><button className="btn btn-wide" type="submit" disabled={loading}>{loading ? 'Đang xác thực…' : 'Đăng nhập ↗'}</button></form><div className="auth-divider"><span>hoặc tiếp tục với</span></div><SocialLoginButtons onError={setError} /><p className="auth-switch">Chưa có tài khoản? <Link to="/register">Đăng ký ngay</Link></p><p className="auth-legal">Bằng việc tiếp tục, bạn đồng ý với Điều khoản sử dụng và Chính sách bảo mật của VNHotel.</p></div></div></main>;
}
