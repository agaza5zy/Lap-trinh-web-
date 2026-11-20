import bcrypt from 'bcryptjs';
import { OAuth2Client } from 'google-auth-library';
import { createRemoteJWKSet, importPKCS8, jwtVerify, SignJWT } from 'jose';
import pool from '../config/db.js';
import { sendVerificationEmail } from '../services/email.service.js';
import { createAccessToken, publicUser, randomToken, sha256, safeEqual, requireString } from '../utils/security.js';
import { HttpError } from '../utils/httpError.js';

const googleClient = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);
const appleJwks = createRemoteJWKSet(new URL('https://appleid.apple.com/auth/keys'));

function authResponse(user) {
  return { token: createAccessToken(user), user: publicUser(user) };
}

export async function googleNonce(_req, res) {
  const challenge = await createOAuthChallenge('google');
  setOAuthCsrfCookie(res, 'g_csrf_token', challenge.csrfToken);
  res.json(challenge);
}

export async function appleNonce(_req, res) {
  const challenge = await createOAuthChallenge('apple');
  setOAuthCsrfCookie(res, 'a_csrf_token', challenge.csrfToken);
  res.json(challenge);
}

function setOAuthCsrfCookie(res, name, value) {
  const secure = process.env.NODE_ENV === 'production' ? '; Secure' : '';
  const path = name === 'g_csrf_token' ? '/api/auth/google' : '/api/auth/apple';
  res.setHeader('Set-Cookie', `${name}=${value}; Path=${path}; Max-Age=300; HttpOnly; SameSite=Lax${secure}`);
}

function readCookie(req, name) {
  const cookies = String(req.headers.cookie || '').split(';');
  const item = cookies.map((value) => value.trim()).find((value) => value.startsWith(`${name}=`));
  return item ? decodeURIComponent(item.slice(name.length + 1)) : '';
}

async function createOAuthChallenge(provider) {
  const nonce = randomToken(32);
  const csrfToken = randomToken(32);
  await pool.execute('DELETE FROM oauth_login_challenges WHERE expires_at <= UTC_TIMESTAMP()');
  await pool.execute(
    'INSERT INTO oauth_login_challenges (provider, nonce_hash, csrf_hash, expires_at) VALUES (?, ?, ?, DATE_ADD(UTC_TIMESTAMP(), INTERVAL 5 MINUTE))',
    [provider, sha256(nonce), sha256(csrfToken)],
  );
  return { nonce, csrfToken };
}

async function consumeOAuthChallenge(provider, nonce, csrfToken, cookieToken) {
  if (!csrfToken || !cookieToken || !safeEqual(csrfToken, cookieToken)) {
    throw new HttpError(403, 'CSRF token không hợp lệ. Vui lòng tải lại trang đăng nhập.', 'OAUTH_CSRF_INVALID');
  }
  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();
    const [rows] = await connection.execute(
      'SELECT challenge_id FROM oauth_login_challenges WHERE provider=? AND nonce_hash=? AND csrf_hash=? AND expires_at>UTC_TIMESTAMP() LIMIT 1 FOR UPDATE',
      [provider, sha256(nonce), sha256(csrfToken)],
    );
    if (!rows.length) throw new HttpError(401, 'Phiên xác thực đã hết hạn hoặc không hợp lệ. Vui lòng thử lại.', 'OAUTH_CHALLENGE_INVALID');
    await connection.execute('DELETE FROM oauth_login_challenges WHERE challenge_id=?', [rows[0].challenge_id]);
    await connection.commit();
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
}

export async function register(req, res) {
  const fullName = requireString(req.body.fullName, 'Họ và tên', 100);
  const email = requireString(req.body.email, 'Email', 150).toLowerCase();
  const password = requireString(req.body.password, 'Mật khẩu', 100);
  if (!/^[^\s@]+@gmail\.com$/i.test(email)) {
    throw new HttpError(400, 'Vui lòng sử dụng địa chỉ Gmail hợp lệ.', 'GMAIL_REQUIRED');
  }
  if (password.length < 8 || !/[A-Za-z]/.test(password) || !/\d/.test(password)) {
    throw new HttpError(400, 'Mật khẩu cần ít nhất 8 ký tự, gồm chữ cái và chữ số.', 'WEAK_PASSWORD');
  }
  const [existing] = await pool.execute('SELECT user_id FROM users WHERE email = ? LIMIT 1', [email]);
  if (existing.length) throw new HttpError(409, 'Email này đã được đăng ký.', 'EMAIL_EXISTS');

  const passwordHash = await bcrypt.hash(password, 12);
  const token = randomToken(32);
  const tokenHash = sha256(token);
  const required = String(process.env.EMAIL_VERIFICATION_REQUIRED || 'true') === 'true';
  const [result] = await pool.execute(
    `INSERT INTO users (full_name, email, password_hash, role, status, email_verified,
      email_verification_token_hash, email_verification_expires, auth_provider)
     VALUES (?, ?, ?, 'customer', 'active', ?, ?, DATE_ADD(UTC_TIMESTAMP(), INTERVAL 30 MINUTE), 'local')`,
    [fullName, email, passwordHash, required ? 0 : 1, required ? tokenHash : null],
  );
  const [rows] = await pool.execute('SELECT * FROM users WHERE user_id = ?', [result.insertId]);
  if (!required) return res.status(201).json({ ...authResponse(rows[0]), verificationRequired: false });
  const mailResult = await sendVerificationEmail({ to: email, name: fullName, token });
  res.status(201).json({
    message: mailResult.delivered ? 'Đã gửi liên kết xác minh đến Gmail của bạn.' : 'Tài khoản đã tạo. Dùng liên kết xác minh bên dưới trong môi trường phát triển.',
    verificationRequired: true,
    ...(mailResult.delivered ? {} : { devVerificationUrl: mailResult.devVerificationUrl, devVerificationToken: mailResult.devVerificationToken }),
  });
}

export async function verifyEmail(req, res) {
  const token = requireString(req.body.token, 'Mã xác minh', 200);
  const tokenHash = sha256(token);
  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();
    const [pending] = await connection.execute(
      'SELECT user_id FROM users WHERE email_verification_token_hash = ? AND email_verification_expires > UTC_TIMESTAMP() LIMIT 1 FOR UPDATE',
      [tokenHash],
    );
    if (!pending.length) throw new HttpError(400, 'Liên kết xác minh không hợp lệ hoặc đã hết hạn.', 'INVALID_VERIFICATION');
    await connection.execute(
      `UPDATE users SET email_verified = 1, email_verification_token_hash = NULL,
        email_verification_expires = NULL WHERE user_id = ? AND email_verification_token_hash = ?`,
      [pending[0].user_id, tokenHash],
    );
    const [rows] = await connection.execute('SELECT * FROM users WHERE user_id = ? LIMIT 1', [pending[0].user_id]);
    await connection.commit();
    res.json({ message: 'Xác minh email thành công.', ...authResponse(rows[0]) });
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
}

export async function resendVerification(req, res) {
  const email = requireString(req.body.email, 'Email', 150).toLowerCase();
  const [rows] = await pool.execute('SELECT user_id, full_name, email, email_verified FROM users WHERE email = ? LIMIT 1', [email]);
  if (!rows.length || rows[0].email_verified) return res.json({ message: 'Nếu tài khoản cần xác minh, email hướng dẫn sẽ được gửi.' });
  const token = randomToken(32);
  await pool.execute(
    `UPDATE users SET email_verification_token_hash = ?, email_verification_expires = DATE_ADD(UTC_TIMESTAMP(), INTERVAL 30 MINUTE) WHERE user_id = ?`,
    [sha256(token), rows[0].user_id],
  );
  const mailResult = await sendVerificationEmail({ to: email, name: rows[0].full_name, token });
  res.json({ message: 'Đã gửi lại hướng dẫn xác minh.', ...(mailResult.delivered ? {} : { devVerificationUrl: mailResult.devVerificationUrl, devVerificationToken: token }) });
}

export async function login(req, res) {
  const email = requireString(req.body.email, 'Email', 150).toLowerCase();
  const password = requireString(req.body.password, 'Mật khẩu', 100);
  const [rows] = await pool.execute('SELECT * FROM users WHERE email = ? LIMIT 1', [email]);
  if (!rows.length || !(await bcrypt.compare(password, rows[0].password_hash))) {
    throw new HttpError(401, 'Email hoặc mật khẩu không chính xác.', 'INVALID_CREDENTIALS');
  }
  const user = rows[0];
  if (user.status !== 'active') throw new HttpError(403, 'Tài khoản đã bị khóa. Vui lòng liên hệ quản trị viên.', 'ACCOUNT_LOCKED');
  if (!user.email_verified) throw new HttpError(403, 'Bạn cần xác minh Gmail trước khi đăng nhập.', 'EMAIL_NOT_VERIFIED');
  res.json(authResponse(user));
}

export async function googleLogin(req, res) {
  if (!process.env.GOOGLE_CLIENT_ID) throw new HttpError(503, 'Google Login chưa được cấu hình GOOGLE_CLIENT_ID.', 'GOOGLE_NOT_CONFIGURED');
  const credential = requireString(req.body.credential, 'Google credential', 10000);
  const nonce = requireString(req.body.nonce, 'Google nonce', 200);
  const csrfToken = requireString(req.body.g_csrf_token, 'Google CSRF token', 200);
  const ticket = await googleClient.verifyIdToken({ idToken: credential, audience: process.env.GOOGLE_CLIENT_ID });
  const payload = ticket.getPayload();
  if (!payload?.sub || !payload.email || payload.email_verified !== true || payload.nonce !== nonce || !String(payload.email).toLowerCase().endsWith('@gmail.com')) {
    throw new HttpError(401, 'Cần tài khoản Gmail đã xác minh và nonce hợp lệ để đăng nhập Google.', 'GOOGLE_TOKEN_INVALID');
  }
  await consumeOAuthChallenge('google', nonce, csrfToken, readCookie(req, 'g_csrf_token'));
  const user = await upsertSocialUser({ provider: 'google', subject: payload.sub, email: payload.email.toLowerCase(), name: String(payload.name || payload.email.split('@')[0]).slice(0, 100) });
  res.json(authResponse(user));
}

export async function appleLogin(req, res) {
  const clientId = process.env.APPLE_CLIENT_ID;
  if (!clientId) throw new HttpError(503, 'Apple Login chưa được cấu hình.', 'APPLE_NOT_CONFIGURED');
  const idToken = requireString(req.body.idToken, 'Apple identity token', 10000);
  const code = requireString(req.body.code, 'Apple authorization code', 2000);
  const nonce = requireString(req.body.nonce, 'Apple nonce', 200);
  const csrfToken = requireString(req.body.a_csrf_token, 'Apple CSRF token', 200);
  const clientSecret = await createAppleClientSecret(clientId);
  const form = new URLSearchParams({ client_id: clientId, client_secret: clientSecret, code, grant_type: 'authorization_code' });
  if (process.env.APPLE_REDIRECT_URI) form.set('redirect_uri', process.env.APPLE_REDIRECT_URI);
  const tokenResponse = await fetch('https://appleid.apple.com/auth/token', {
    method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, body: form,
  });
  if (!tokenResponse.ok) throw new HttpError(401, 'Apple không chấp nhận mã xác thực. Vui lòng thử lại.', 'APPLE_CODE_INVALID');
  const appleTokens = await tokenResponse.json();
  const verifiedToken = appleTokens.id_token || idToken;
  const { payload } = await jwtVerify(verifiedToken, appleJwks, {
    issuer: 'https://appleid.apple.com', audience: clientId,
  });
  if (!payload.sub || !payload.email || ![true, 'true'].includes(payload.email_verified)) {
    throw new HttpError(401, 'Không thể xác minh tài khoản Apple.', 'APPLE_TOKEN_INVALID');
  }
  if (payload.nonce !== nonce && payload.nonce !== sha256(nonce)) throw new HttpError(401, 'Apple nonce không khớp. Vui lòng thử đăng nhập lại.', 'APPLE_NONCE_INVALID');
  await consumeOAuthChallenge('apple', nonce, csrfToken, readCookie(req, 'a_csrf_token'));
  let suppliedName = '';
  if (req.body.user && typeof req.body.user === 'object') {
    suppliedName = [req.body.user.name?.firstName, req.body.user.name?.lastName].filter(Boolean).join(' ').trim();
  }
  const user = await upsertSocialUser({ provider: 'apple', subject: payload.sub, email: String(payload.email).toLowerCase(), name: String(suppliedName || String(payload.email).split('@')[0]).slice(0, 100) });
  res.json(authResponse(user));
}

async function createAppleClientSecret(clientId) {
  const { APPLE_TEAM_ID: teamId, APPLE_KEY_ID: keyId, APPLE_PRIVATE_KEY: rawKey } = process.env;
  if (!teamId || !keyId || !rawKey) throw new HttpError(503, 'Apple Login cần APPLE_TEAM_ID, APPLE_KEY_ID và APPLE_PRIVATE_KEY.', 'APPLE_NOT_CONFIGURED');
  const privateKey = await importPKCS8(rawKey.replace(/\\n/g, '\n'), 'ES256');
  return new SignJWT({})
    .setProtectedHeader({ alg: 'ES256', kid: keyId })
    .setIssuer(teamId).setSubject(clientId).setAudience('https://appleid.apple.com')
    .setIssuedAt().setExpirationTime('5m').sign(privateKey);
}

async function upsertSocialUser({ provider, subject, email, name }) {
  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();
    const [byProvider] = await connection.execute('SELECT * FROM users WHERE auth_provider = ? AND provider_subject = ? LIMIT 1 FOR UPDATE', [provider, subject]);
    let user = byProvider[0];
    if (!user) {
      const [byEmail] = await connection.execute('SELECT * FROM users WHERE email = ? LIMIT 1 FOR UPDATE', [email]);
      if (byEmail.length) {
        user = byEmail[0];
        if (user.auth_provider && user.auth_provider !== 'local' && user.auth_provider !== provider) {
          throw new HttpError(409, 'Email này đã liên kết với một nhà cung cấp đăng nhập khác.', 'SOCIAL_ACCOUNT_CONFLICT');
        }
        await connection.execute(
          `UPDATE users SET auth_provider = ?, provider_subject = ?, email_verified = 1,
            full_name = CASE WHEN full_name = '' THEN ? ELSE full_name END WHERE user_id = ?`,
          [provider, subject, name, user.user_id],
        );
      } else {
        const randomPasswordHash = await bcrypt.hash(randomToken(32), 12);
        const [result] = await connection.execute(
          `INSERT INTO users (full_name, email, password_hash, role, status, email_verified, auth_provider, provider_subject)
           VALUES (?, ?, ?, 'customer', 'active', 1, ?, ?)`,
          [String(name || email.split('@')[0]).slice(0, 100), email, randomPasswordHash, provider, subject],
        );
        const [created] = await connection.execute('SELECT * FROM users WHERE user_id = ?', [result.insertId]);
        user = created[0];
      }
    }
    const [fresh] = await connection.execute('SELECT * FROM users WHERE user_id = ?', [user.user_id]);
    if (fresh[0].status !== 'active') throw new HttpError(403, 'Tài khoản đã bị khóa.', 'ACCOUNT_LOCKED');
    await connection.commit();
    return fresh[0];
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
}

export async function me(req, res) {
  res.json({ user: publicUser(req.user) });
}
