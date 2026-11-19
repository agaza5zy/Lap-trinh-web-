import express from 'express';
import path from 'node:path';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import authRoutes from './routes/auth.routes.js';
import hotelRoutes from './routes/hotel.routes.js';
import roomRoutes from './routes/room.routes.js';
import bookingRoutes from './routes/booking.routes.js';
import paymentRoutes from './routes/payment.routes.js';
import promotionRoutes from './routes/promotion.routes.js';
import reviewRoutes from './routes/review.routes.js';
import adminRoutes from './routes/admin.routes.js';
import errorHandler from './middleware/errorHandler.js';

const app = express();
app.set('trust proxy', 1);
app.use(helmet({
  crossOriginResourcePolicy: { policy: 'cross-origin' },
  // GIS and Sign in with Apple load their official scripts/frames in popups.
  crossOriginOpenerPolicy: { policy: 'same-origin-allow-popups' },
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      baseUri: ["'self'"],
      objectSrc: ["'none'"],
      frameAncestors: ["'self'"],
      scriptSrc: ["'self'", 'https://accounts.google.com', 'https://appleid.cdn-apple.com'],
      styleSrc: ["'self'", "'unsafe-inline'", 'https://accounts.google.com', 'https://fonts.googleapis.com'],
      imgSrc: ["'self'", 'data:', 'https:'],
      fontSrc: ["'self'", 'data:', 'https://fonts.gstatic.com', 'https:'],
      connectSrc: ["'self'", 'https://accounts.google.com', 'https://appleid.apple.com'],
      frameSrc: ["'self'", 'https://accounts.google.com', 'https://appleid.apple.com'],
      formAction: ["'self'", 'https://appleid.apple.com'],
    },
  },
}));

function normalizeOrigin(value) {
  const candidate = String(value || '').trim();
  if (!candidate) return '';
  try {
    return new URL(candidate.includes('://') ? candidate : `https://${candidate}`).origin;
  } catch {
    return '';
  }
}

const configuredOrigins = String(process.env.CLIENT_URL || '').split(',').map(normalizeOrigin);
const vercelOrigins = [process.env.VERCEL_URL, process.env.VERCEL_BRANCH_URL, process.env.VERCEL_PROJECT_PRODUCTION_URL].map(normalizeOrigin);
const localOrigins = process.env.NODE_ENV === 'production' ? [] : ['http://localhost:5173', 'http://127.0.0.1:5173'];
const allowedOrigins = new Set([...configuredOrigins, ...vercelOrigins, ...localOrigins].filter(Boolean));
app.use(cors({ origin(origin, callback) {
  if (!origin || allowedOrigins.has(normalizeOrigin(origin))) return callback(null, true);
  return callback(new Error('Origin không được phép truy cập API.'));
}, credentials: true }));
app.use(express.json({ limit: '1mb' }));
app.use(morgan(process.env.NODE_ENV === 'production' ? 'combined' : 'dev'));
app.get('/api/health', (_req, res) => res.json({ ok: true, service: 'vnhotel-api', time: new Date().toISOString() }));
app.use('/api/auth', authRoutes);
app.use('/api/hotels', hotelRoutes);
app.use('/api/rooms', roomRoutes);
app.use('/api/bookings', bookingRoutes);
app.use('/api/payments', paymentRoutes);
app.use('/api/promotions', promotionRoutes);
app.use('/api/reviews', reviewRoutes);
app.use('/api/admin', adminRoutes);

// On Vercel, Vite builds the SPA into the root /public directory. Static assets
// are served here and React Router deep links fall back to index.html.
if (process.env.SERVE_FRONTEND === 'true' || process.env.VERCEL === '1') {
  const frontendDirectory = path.resolve(process.cwd(), 'public');
  app.use(express.static(frontendDirectory, { index: false, fallthrough: true }));
  app.get('*', (req, res, next) => {
    if (req.path === '/api' || req.path.startsWith('/api/')) return next();
    res.sendFile(path.join(frontendDirectory, 'index.html'), (error) => {
      if (error) next(error);
    });
  });
}

app.use((_req, res) => res.status(404).json({ message: 'API endpoint không tồn tại.' }));
app.use(errorHandler);
export default app;
