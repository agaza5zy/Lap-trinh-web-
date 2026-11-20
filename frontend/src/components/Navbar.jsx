import { useState } from 'react';
import { Link, NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function Navbar() {
  const { user, logout } = useAuth();
  const [open, setOpen] = useState(false);
  const navigate = useNavigate();
  const close = () => setOpen(false);
  return (
    <header className="site-header">
      <div className="container nav-inner">
        <Link to="/" className="brand" onClick={close}><span className="brand-mark">✦</span> VNHotel</Link>
        <button className="mobile-menu" aria-label="Mở menu" onClick={() => setOpen(!open)}>☰</button>
        <nav className={`main-nav ${open ? 'is-open' : ''}`}>
          <NavLink to="/" end onClick={close}>Trang chủ</NavLink>
          <NavLink to="/rooms" onClick={close}>Khách sạn & phòng</NavLink>
          <NavLink to="/about" onClick={close}>Về VNHotel</NavLink>
          {user ? (
            <>
              <NavLink to="/account" onClick={close}>Tài khoản</NavLink>
              {['admin', 'staff'].includes(user.role) && <NavLink to="/admin" onClick={close}>Quản lý khách sạn</NavLink>}
              <button className="nav-user" onClick={() => { logout(); close(); navigate('/'); }}>Đăng xuất</button>
            </>
          ) : (
            <>
              <NavLink to="/login" onClick={close}>Đăng nhập</NavLink>
              <Link to="/register" className="btn btn-nav" onClick={close}>Tạo tài khoản</Link>
            </>
          )}
        </nav>
      </div>
    </header>
  );
}
