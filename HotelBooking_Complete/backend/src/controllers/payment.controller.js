import { getAppUrl, getApiUrl } from '../config/urls.js';
import pool from '../config/db.js';
import { HttpError } from '../utils/httpError.js';
import { hmacSha256, safeEqual } from '../utils/security.js';

const providerMethod = { bank_transfer: 'bank_transfer', momo: 'e_wallet', zalopay: 'e_wallet', paypal: 'card' };

export function paymentConfig(_req, res) {
  const bankReady = Boolean(process.env.BANK_BIN && process.env.BANK_ACCOUNT_NO && process.env.BANK_ACCOUNT_NAME);
  res.json({
    methods: [
      { id: 'bank_transfer', label: 'Chuyển khoản ngân hàng', enabled: bankReady, description: 'Quét VietQR bằng ứng dụng ngân hàng.' },
      { id: 'momo', label: 'Ví MoMo', enabled: Boolean(process.env.MOMO_PARTNER_CODE && process.env.MOMO_ACCESS_KEY && process.env.MOMO_SECRET_KEY), description: 'Thanh toán qua cổng MoMo.' },
      { id: 'zalopay', label: 'ZaloPay', enabled: Boolean(process.env.ZALOPAY_APP_ID && process.env.ZALOPAY_KEY1 && process.env.ZALOPAY_KEY2), description: 'Thanh toán qua cổng ZaloPay.' },
      { id: 'paypal', label: 'PayPal', enabled: Boolean(process.env.PAYPAL_CLIENT_ID && process.env.PAYPAL_CLIENT_SECRET && Number(process.env.PAYPAL_VND_PER_USD) > 0), description: 'Thanh toán quốc tế, quy đổi sang USD theo tỷ giá cấu hình.' },
    ],
    bank: bankReady ? { name: process.env.BANK_NAME || 'Ngân hàng', accountNo: process.env.BANK_ACCOUNT_NO, accountName: process.env.BANK_ACCOUNT_NAME, demoMode: String(process.env.BANK_TRANSFER_DEMO || 'false') === 'true' } : null,
    paypalCurrency: process.env.PAYPAL_CURRENCY || 'USD',
  });
}

export async function createPayment(req, res) {
  const bookingCode = String(req.body.bookingCode || '').trim();
  const provider = String(req.body.method || '').trim().toLowerCase();
  if (!bookingCode || !providerMethod[provider]) throw new HttpError(400, 'Thông tin đơn đặt phòng hoặc phương thức thanh toán không hợp lệ.', 'INVALID_PAYMENT_REQUEST');
  assertProviderConfigured(provider);

  const connection = await pool.getConnection();
  let booking;
  let paymentId;
  try {
    await connection.beginTransaction();
    const [bookings] = await connection.execute(
      `SELECT b.*, h.name AS hotel_name FROM bookings b JOIN hotels h ON h.hotel_id=b.hotel_id
       WHERE b.booking_code=? AND b.user_id=? LIMIT 1 FOR UPDATE`, [bookingCode, req.user.user_id],
    );
    if (!bookings.length) throw new HttpError(404, 'Không tìm thấy đơn đặt phòng của tài khoản này.', 'BOOKING_NOT_FOUND');
    booking = bookings[0];
    if (booking.status === 'cancelled') throw new HttpError(400, 'Đơn đã bị hủy, không thể thanh toán.', 'BOOKING_CANCELLED');
    const [paid] = await connection.execute("SELECT payment_id FROM payments WHERE booking_id=? AND status='paid' LIMIT 1 FOR UPDATE", [booking.booking_id]);
    if (paid.length) throw new HttpError(409, 'Đơn đặt phòng đã được thanh toán.', 'ALREADY_PAID');
    const [pending] = await connection.execute("SELECT provider FROM payments WHERE booking_id=? AND status='pending' ORDER BY payment_id DESC LIMIT 1 FOR UPDATE", [booking.booking_id]);
    if (pending.length) throw new HttpError(409, `Đơn đang có giao dịch ${pending[0].provider} chờ xử lý. Hãy hoàn tất giao dịch đó hoặc liên hệ nhân viên để được hỗ trợ.`, 'PAYMENT_ALREADY_PENDING');
    const [insert] = await connection.execute(
      `INSERT INTO payments (booking_id, amount, payment_type, method, provider, status)
       VALUES (?, ?, 'payment', ?, ?, 'pending')`,
      [booking.booking_id, Number(booking.total_amount), providerMethod[provider], provider],
    );
    paymentId = insert.insertId;
    await connection.commit();
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }

  try {
    let result;
    if (provider === 'bank_transfer') result = createBankTransfer(booking, paymentId);
    if (provider === 'momo') result = await createMomoPayment(booking, paymentId);
    if (provider === 'zalopay') result = await createZaloPayment(booking, paymentId, req.user);
    if (provider === 'paypal') result = await createPayPalPayment(booking, paymentId);
    await pool.execute('UPDATE payments SET gateway_order_id=?, gateway_payload=? WHERE payment_id=?', [
      result.gatewayOrderId || null, JSON.stringify(result.payload || result), paymentId,
    ]);
    res.status(201).json({ paymentId, provider, status: 'pending', ...result });
  } catch (error) {
    await pool.execute("UPDATE payments SET status='failed' WHERE payment_id=?", [paymentId]);
    throw error;
  }
}

function assertProviderConfigured(provider) {
  const configured = {
    bank_transfer: Boolean(process.env.BANK_BIN && process.env.BANK_ACCOUNT_NO && process.env.BANK_ACCOUNT_NAME),
    momo: Boolean(process.env.MOMO_PARTNER_CODE && process.env.MOMO_ACCESS_KEY && process.env.MOMO_SECRET_KEY),
    zalopay: Boolean(process.env.ZALOPAY_APP_ID && process.env.ZALOPAY_KEY1 && process.env.ZALOPAY_KEY2),
    paypal: Boolean(process.env.PAYPAL_CLIENT_ID && process.env.PAYPAL_CLIENT_SECRET && Number(process.env.PAYPAL_VND_PER_USD) > 0),
  };
  if (!configured[provider]) throw new HttpError(503, `Phương thức ${provider} chưa được cấu hình thông tin merchant trong backend/.env.`, 'PAYMENT_NOT_CONFIGURED');
}

function createBankTransfer(booking, paymentId) {
  const transferContent = `VNHOTEL ${booking.booking_code}`;
  const amount = Number(booking.total_amount);
  const qr = new URL(`https://img.vietqr.io/image/${encodeURIComponent(process.env.BANK_BIN)}-${encodeURIComponent(process.env.BANK_ACCOUNT_NO)}-compact2.png`);
  qr.searchParams.set('amount', String(amount));
  qr.searchParams.set('addInfo', transferContent);
  qr.searchParams.set('accountName', process.env.BANK_ACCOUNT_NAME);
  return {
    gatewayOrderId: `BANK-${paymentId}`,
    qrUrl: qr.toString(),
    bank: { name: process.env.BANK_NAME || 'Ngân hàng', accountNo: process.env.BANK_ACCOUNT_NO, accountName: process.env.BANK_ACCOUNT_NAME },
    transferContent,
    amount,
    demoMode: String(process.env.BANK_TRANSFER_DEMO || 'false') === 'true',
    note: 'Quét mã QR và chuyển khoản đúng số tiền, đúng nội dung. Hệ thống chỉ xác nhận sau khi đối soát giao dịch.',
    payload: { transferContent, amount, bankBin: process.env.BANK_BIN },
  };
}

async function createMomoPayment(booking, paymentId) {
  const partnerCode = process.env.MOMO_PARTNER_CODE;
  const accessKey = process.env.MOMO_ACCESS_KEY;
  const secretKey = process.env.MOMO_SECRET_KEY;
  const requestId = `VN${paymentId}${Date.now()}`;
  const orderId = `VN${booking.booking_code}_${paymentId}`;
  const amount = String(Number(booking.total_amount));
  const redirectUrl = `${getAppUrl()}/payment-result?provider=momo&booking=${encodeURIComponent(booking.booking_code)}`;
  const ipnUrl = `${getApiUrl()}/api/payments/momo/ipn`;
  const orderInfo = `Thanh toan dat phong ${booking.booking_code}`;
  const requestType = 'captureWallet';
  const extraData = '';
  const raw = `accessKey=${accessKey}&amount=${amount}&extraData=${extraData}&ipnUrl=${ipnUrl}&orderId=${orderId}&orderInfo=${orderInfo}&partnerCode=${partnerCode}&redirectUrl=${redirectUrl}&requestId=${requestId}&requestType=${requestType}`;
  const body = {
    partnerCode, partnerName: process.env.MOMO_PARTNER_NAME || 'VNHotel', storeId: process.env.MOMO_STORE_ID || 'VNHotel',
    requestId, amount: Number(amount), orderId, orderInfo, redirectUrl, ipnUrl, requestType, extraData, lang: 'vi',
    signature: hmacSha256(secretKey, raw),
  };
  const host = process.env.MOMO_ENV === 'production' ? 'https://payment.momo.vn' : 'https://test-payment.momo.vn';
  const response = await fetch(`${host}/v2/gateway/api/create`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
  const data = await response.json();
  if (!response.ok || Number(data.resultCode) !== 0 || !data.payUrl) throw new HttpError(502, data.message || 'Không thể tạo giao dịch MoMo.', 'MOMO_CREATE_FAILED');
  return { gatewayOrderId: orderId, redirectUrl: data.payUrl, qrCodeUrl: data.qrCodeUrl || null, deeplink: data.deeplink || null, payload: { requestId, orderId, resultCode: data.resultCode } };
}

async function createZaloPayment(booking, paymentId, user) {
  const appId = Number(process.env.ZALOPAY_APP_ID);
  const appUser = String(user.user_id);
  const now = Date.now();
  const date = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Ho_Chi_Minh', year: '2-digit', month: '2-digit', day: '2-digit' }).format(new Date()).replaceAll('-', '');
  const appTransId = `${date}_${booking.booking_code}_${paymentId}`.slice(0, 40);
  const amount = Number(booking.total_amount);
  const item = '[]';
  const redirectUrl = `${getAppUrl()}/payment-result?provider=zalopay&booking=${encodeURIComponent(booking.booking_code)}`;
  const embedData = JSON.stringify({ redirecturl: redirectUrl, preferred_payment_method: ['zalopay_wallet', 'vietqr'] });
  const body = {
    app_id: appId, app_user: appUser, app_trans_id: appTransId, app_time: now, amount,
    description: `VNHotel ${booking.booking_code}`, callback_url: `${getApiUrl()}/api/payments/zalopay/callback`,
    item, embed_data: embedData, bank_code: '', expire_duration_seconds: 900,
  };
  const macInput = [body.app_id, body.app_trans_id, body.app_user, body.amount, body.app_time, body.embed_data, body.item].join('|');
  body.mac = hmacSha256(process.env.ZALOPAY_KEY1, macInput);
  const host = process.env.ZALOPAY_ENV === 'production' ? 'https://openapi.zalopay.vn' : 'https://sb-openapi.zalopay.vn';
  const response = await fetch(`${host}/v2/create`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
  const data = await response.json();
  if (!response.ok || Number(data.return_code) !== 1 || !data.order_url) throw new HttpError(502, data.return_message || 'Không thể tạo giao dịch ZaloPay.', 'ZALOPAY_CREATE_FAILED');
  return { gatewayOrderId: appTransId, redirectUrl: data.order_url, qrCode: data.qr_code || null, payload: { appTransId, zpTransToken: data.zp_trans_token || null } };
}

async function paypalAccessToken() {
  const host = process.env.PAYPAL_ENV === 'production' ? 'https://api-m.paypal.com' : 'https://api-m.sandbox.paypal.com';
  const credentials = Buffer.from(`${process.env.PAYPAL_CLIENT_ID}:${process.env.PAYPAL_CLIENT_SECRET}`).toString('base64');
  const response = await fetch(`${host}/v1/oauth2/token`, { method: 'POST', headers: { Authorization: `Basic ${credentials}`, 'Content-Type': 'application/x-www-form-urlencoded' }, body: 'grant_type=client_credentials' });
  const data = await response.json();
  if (!response.ok || !data.access_token) throw new HttpError(502, 'Không thể xác thực với PayPal.', 'PAYPAL_AUTH_FAILED');
  return { host, token: data.access_token };
}

async function createPayPalPayment(booking, paymentId) {
  const { host, token } = await paypalAccessToken();
  const rate = Number(process.env.PAYPAL_VND_PER_USD);
  const currency = process.env.PAYPAL_CURRENCY || 'USD';
  const usdAmount = (Number(booking.total_amount) / rate).toFixed(2);
  const response = await fetch(`${host}/v2/checkout/orders`, {
    method: 'POST', headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      intent: 'CAPTURE',
      purchase_units: [{ reference_id: booking.booking_code, custom_id: String(paymentId), description: `VNHotel booking ${booking.booking_code}`, amount: { currency_code: currency, value: usdAmount } }],
      application_context: { brand_name: 'VNHotel', user_action: 'PAY_NOW', return_url: `${getAppUrl()}/payment-result?provider=paypal&booking=${encodeURIComponent(booking.booking_code)}`, cancel_url: `${getAppUrl()}/checkout/${encodeURIComponent(booking.booking_code)}?cancel=paypal` },
    }),
  });
  const data = await response.json();
  const approve = data.links?.find((link) => link.rel === 'approve')?.href;
  if (!response.ok || !data.id || !approve) throw new HttpError(502, data.message || 'Không thể tạo đơn PayPal.', 'PAYPAL_CREATE_FAILED');
  return { gatewayOrderId: data.id, redirectUrl: approve, paypalAmount: usdAmount, currency, payload: { paypalOrderId: data.id, vndAmount: Number(booking.total_amount), paypalAmount: usdAmount, currency, rate } };
}

export async function momoIpn(req, res) {
  const body = req.body || {};
  const keys = ['accessKey', 'amount', 'extraData', 'message', 'orderId', 'orderInfo', 'orderType', 'partnerCode', 'payType', 'requestId', 'responseTime', 'resultCode', 'transId'];
  const raw = keys.map((key) => `${key}=${body[key] ?? ''}`).join('&');
  const expected = hmacSha256(process.env.MOMO_SECRET_KEY || '', raw);
  if (!process.env.MOMO_SECRET_KEY || body.partnerCode !== process.env.MOMO_PARTNER_CODE || body.accessKey !== process.env.MOMO_ACCESS_KEY || !safeEqual(expected, body.signature)) return res.status(400).json({ message: 'Invalid signature' });
  if (Number(body.resultCode) === 0) await markPaid({ provider: 'momo', gatewayOrderId: body.orderId, amount: Number(body.amount), transactionCode: String(body.transId || '') });
  res.json({ message: 'success' });
}

export async function zaloCallback(req, res) {
  const { data, mac, type } = req.body || {};
  if (!data || !mac || Number(type) !== 1 || !process.env.ZALOPAY_KEY2) return res.json({ return_code: 2, return_message: 'Invalid' });
  const expected = hmacSha256(process.env.ZALOPAY_KEY2, data);
  if (!safeEqual(expected, mac)) return res.json({ return_code: 2, return_message: 'Invalid' });
  const transaction = JSON.parse(data);
  if (Number(transaction.app_id) !== Number(process.env.ZALOPAY_APP_ID)) return res.json({ return_code: 2, return_message: 'Invalid app_id' });
  await markPaid({ provider: 'zalopay', gatewayOrderId: transaction.app_trans_id, amount: Number(transaction.amount), transactionCode: String(transaction.zp_trans_id || '') });
  res.json({ return_code: 1, return_message: 'Success' });
}

async function markPaid({ provider, gatewayOrderId, amount, transactionCode }) {
  if (!transactionCode) throw new HttpError(400, 'Thiếu mã giao dịch từ nhà cung cấp.', 'PAYMENT_TRANSACTION_CODE_MISSING');
  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();
    const [lookup] = await connection.execute(
      'SELECT payment_id, booking_id FROM payments WHERE provider=? AND gateway_order_id=? LIMIT 1', [provider, gatewayOrderId],
    );
    if (!lookup.length) throw new HttpError(404, 'Không tìm thấy giao dịch.', 'PAYMENT_NOT_FOUND');
    await connection.execute('SELECT booking_id FROM bookings WHERE booking_id=? FOR UPDATE', [lookup[0].booking_id]);
    const [rows] = await connection.execute(
      'SELECT payment_id, booking_id, amount, status FROM payments WHERE payment_id=? LIMIT 1 FOR UPDATE', [lookup[0].payment_id],
    );
    const payment = rows[0];
    if (Number(payment.amount) !== Number(amount)) throw new HttpError(400, 'Số tiền callback không khớp.', 'PAYMENT_AMOUNT_MISMATCH');
    if (payment.status !== 'paid') {
      await connection.execute("UPDATE payments SET status='paid', transaction_code=?, paid_at=UTC_TIMESTAMP() WHERE payment_id=?", [transactionCode || null, payment.payment_id]);
      await connection.execute("UPDATE bookings SET status='confirmed' WHERE booking_id=? AND status='pending'", [payment.booking_id]);
    }
    await connection.commit();
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
}

export async function capturePayPal(req, res) {
  const orderId = String(req.body.orderId || '').trim();
  const bookingCode = String(req.body.bookingCode || '').trim();
  if (!orderId || !bookingCode) throw new HttpError(400, 'Thiếu mã giao dịch PayPal hoặc mã đặt phòng.', 'PAYPAL_CAPTURE_INPUT');
  const [rows] = await pool.execute(
    `SELECT p.*, b.booking_code FROM payments p JOIN bookings b ON b.booking_id=p.booking_id
     WHERE p.provider='paypal' AND p.gateway_order_id=? AND b.booking_code=? AND b.user_id=? LIMIT 1`,
    [orderId, bookingCode, req.user.user_id],
  );
  if (!rows.length) throw new HttpError(404, 'Không tìm thấy giao dịch PayPal tương ứng.', 'PAYPAL_ORDER_NOT_FOUND');
  const payment = rows[0];
  if (payment.status === 'paid') return res.json({ message: 'Giao dịch đã được xác nhận.', status: 'paid' });
  const { host, token } = await paypalAccessToken();
  const response = await fetch(`${host}/v2/checkout/orders/${encodeURIComponent(orderId)}/capture`, {
    method: 'POST', headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
  });
  const data = await response.json();
  const purchaseUnit = data.purchase_units?.[0];
  const capture = purchaseUnit?.payments?.captures?.[0];
  const gatewayPayload = typeof payment.gateway_payload === 'string' ? JSON.parse(payment.gateway_payload) : (payment.gateway_payload || {});
  if (!response.ok || data.status !== 'COMPLETED' || !capture ||
      purchaseUnit.reference_id !== bookingCode || purchaseUnit.custom_id !== String(payment.payment_id) ||
      capture.amount?.currency_code !== (gatewayPayload.currency || process.env.PAYPAL_CURRENCY || 'USD') ||
      Number(capture.amount?.value) !== Number(gatewayPayload.paypalAmount)) {
    throw new HttpError(402, data.message || 'PayPal chưa xác nhận đúng số tiền giao dịch.', 'PAYPAL_CAPTURE_FAILED');
  }
  await markPaid({ provider: 'paypal', gatewayOrderId: orderId, amount: Number(payment.amount), transactionCode: capture.id });
  res.json({ message: 'Thanh toán PayPal thành công.', status: 'paid', captureId: capture.id });
}

export async function paymentStatus(req, res) {
  const [rows] = await pool.execute(
    `SELECT p.payment_id AS id, p.provider, p.amount, p.status, p.transaction_code AS transactionCode, p.created_at AS createdAt,
      b.booking_code AS bookingCode FROM payments p JOIN bookings b ON b.booking_id=p.booking_id
     WHERE b.booking_code=? AND b.user_id=? ORDER BY p.payment_id DESC LIMIT 1`, [req.params.bookingCode, req.user.user_id],
  );
  if (!rows.length) throw new HttpError(404, 'Chưa có giao dịch thanh toán cho đơn này.', 'PAYMENT_NOT_FOUND');
  res.json({ payment: rows[0] });
}

export async function confirmBankTransfer(req, res) {
  const paymentId = Number(req.params.id);
  const [rows] = await pool.execute("SELECT payment_id, booking_id, provider, status FROM payments WHERE payment_id=? LIMIT 1", [paymentId]);
  if (!rows.length || rows[0].provider !== 'bank_transfer') throw new HttpError(404, 'Không tìm thấy giao dịch chuyển khoản.', 'PAYMENT_NOT_FOUND');
  if (rows[0].status !== 'paid') {
    await pool.execute("UPDATE payments SET status='paid', transaction_code=?, paid_at=UTC_TIMESTAMP() WHERE payment_id=?", [String(req.body.transactionCode || `BANK-VERIFIED-${paymentId}`).slice(0, 100), paymentId]);
    await pool.execute("UPDATE bookings SET status='confirmed' WHERE booking_id=? AND status='pending'", [rows[0].booking_id]);
  }
  res.json({ message: 'Đã xác nhận giao dịch chuyển khoản.' });
}
