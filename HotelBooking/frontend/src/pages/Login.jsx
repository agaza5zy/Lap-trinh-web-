import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';

export default function Login() {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  function submit(e) {
    e.preventDefault();
    if (email && password) {
      navigate('/admin');
    }
  }

  return (
    <main className="auth-page">
      <div className="auth-card">
        <div className="auth-icon">✦</div>
        <h1>Đăng nhập</h1>
        <p className="muted">Chào mừng bạn quay lại VNHotel</p>

        <form className="stack-form" onSubmit={submit}>
          <label>
            Email
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Nhập địa chỉ email"
            />
          </label>

          <label>
            Mật khẩu
            <input
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Nhập mật khẩu"
            />
          </label>

          <button type="submit" className="btn btn-wide">
            Đăng nhập →
          </button>
        </form>

        <p className="demo-note">
          Đây là bản demo: nhập email và mật khẩu bất kỳ để xem trang quản trị.
          Chưa có xác thực tài khoản.
        </p>

        <Link className="text-link" to="/">
          ← Về trang chủ
        </Link>
      </div>
    </main>
  );
}