import { Routes, Route } from 'react-router-dom';
import Navbar from './components/Navbar';
import Footer from './components/Footer';
import ProtectedRoute from './components/ProtectedRoute';
import Home from './pages/Home';
import Rooms from './pages/Rooms';
import RoomDetail from './pages/RoomDetail';
import Booking from './pages/Booking';
import Checkout from './pages/Checkout';
import PaymentResult from './pages/PaymentResult';
import About from './pages/About';
import Login from './pages/Login';
import Register from './pages/Register';
import VerifyEmail from './pages/VerifyEmail';
import Account from './pages/Account';
import Admin from './pages/Admin';

export default function App() {
  return <><Navbar /><Routes>
    <Route path="/" element={<Home />} />
    <Route path="/rooms" element={<Rooms />} />
    <Route path="/rooms/:id" element={<RoomDetail />} />
    <Route path="/about" element={<About />} />
    <Route path="/login" element={<Login />} />
    <Route path="/register" element={<Register />} />
    <Route path="/verify-email" element={<VerifyEmail />} />
    <Route path="/booking" element={<ProtectedRoute><Booking /></ProtectedRoute>} />
    <Route path="/checkout/:bookingCode" element={<ProtectedRoute><Checkout /></ProtectedRoute>} />
    <Route path="/payment-result" element={<ProtectedRoute><PaymentResult /></ProtectedRoute>} />
    <Route path="/account" element={<ProtectedRoute><Account /></ProtectedRoute>} />
    <Route path="/admin" element={<ProtectedRoute roles={['admin', 'staff']}><Admin /></ProtectedRoute>} />
    <Route path="*" element={<main className="container section"><div className="empty-state"><h1>404 — Không tìm thấy trang</h1><p>Đường dẫn bạn truy cập không tồn tại.</p><a className="btn" href="/">Về trang chủ</a></div></main>} />
  </Routes><Footer /></>;
}
