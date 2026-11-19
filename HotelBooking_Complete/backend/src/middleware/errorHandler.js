export default function errorHandler(error, _req, res, _next) {
  const status = Number(error.status || 500);
  if (status >= 500) console.error('[API]', error);
  const message = status >= 500 ? 'Đã xảy ra lỗi máy chủ. Vui lòng thử lại sau.' : error.message;
  res.status(status).json({ message, code: error.code || 'SERVER_ERROR' });
}
