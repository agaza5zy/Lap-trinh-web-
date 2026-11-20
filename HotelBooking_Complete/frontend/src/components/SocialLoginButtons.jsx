import { useEffect, useRef, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { getAppleNonceApi, getGoogleNonceApi } from '../api/auth';

function loadScript(src, id) {
  return new Promise((resolve, reject) => {
    if (document.getElementById(id)) return resolve();
    const script = document.createElement('script');
    script.id = id; script.src = src; script.async = true; script.defer = true;
    script.onload = resolve; script.onerror = reject;
    document.head.appendChild(script);
  });
}

function randomString() {
  const bytes = new Uint8Array(24);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, (byte) => byte.toString(16).padStart(2, '0')).join('');
}

export default function SocialLoginButtons({ onError }) {
  const { loginWithGoogle, loginWithApple } = useAuth();
  const googleRef = useRef(null);
  const [appleBusy, setAppleBusy] = useState(false);
  const googleClientId = import.meta.env.VITE_GOOGLE_CLIENT_ID;
  const appleClientId = import.meta.env.VITE_APPLE_CLIENT_ID;
  const appleRedirectUri = import.meta.env.VITE_APPLE_REDIRECT_URI;

  useEffect(() => {
    let active = true;
    if (!googleClientId || !googleRef.current) return undefined;
    loadScript('https://accounts.google.com/gsi/client', 'google-identity-services').then(() => {
      if (!active || !window.google?.accounts?.id || !googleRef.current) return;
      return getGoogleNonceApi().then(({ nonce, csrfToken }) => {
      if (!active) return;
      window.google.accounts.id.initialize({
        client_id: googleClientId,
        nonce,
        callback: async (response) => {
          try { await loginWithGoogle(response.credential, nonce, csrfToken); window.location.assign('/account'); }
          catch (error) { onError?.(error.response?.data?.message || 'Đăng nhập Google thất bại.'); }
        },
        auto_select: false,
      });
      window.google.accounts.id.renderButton(googleRef.current, { theme: 'outline', size: 'large', shape: 'rectangular', text: 'continue_with', width: 320, logo_alignment: 'left' });
      });
    }).catch(() => onError?.('Không tải được dịch vụ đăng nhập Google.'));
    return () => { active = false; };
  }, [googleClientId, loginWithGoogle, onError]);

  async function signInApple() {
    if (!appleClientId || !appleRedirectUri) return onError?.('Cần cấu hình VITE_APPLE_CLIENT_ID và VITE_APPLE_REDIRECT_URI (HTTPS domain).');
    setAppleBusy(true);
    try {
      await loadScript('https://appleid.cdn-apple.com/appleauth/static/jsapi/appleid/1/en_US/appleid.auth.js', 'apple-signin-js');
      const { nonce, csrfToken } = await getAppleNonceApi();
      const state = randomString();
      window.AppleID.auth.init({
        clientId: appleClientId,
        scope: 'name email',
        redirectURI: appleRedirectUri,
        state,
        nonce,
        usePopup: true,
      });
      const response = await window.AppleID.auth.signIn();
      if (response.authorization?.state !== state) throw new Error('Apple state không khớp.');
      await loginWithApple({
        idToken: response.authorization.id_token,
        code: response.authorization.code,
        nonce,
        a_csrf_token: csrfToken,
        user: response.user || null,
      });
      window.location.assign('/account');
    } catch (error) {
      onError?.(error.response?.data?.message || error.message || 'Đăng nhập Apple thất bại.');
    } finally { setAppleBusy(false); }
  }

  return (
    <div className="social-auth">
      {googleClientId ? <div className="google-button-wrap"><div ref={googleRef} /></div> : <p className="provider-note">Google: thêm VITE_GOOGLE_CLIENT_ID vào frontend/.env</p>}
      <button type="button" className="social-button apple-button" onClick={signInApple} disabled={appleBusy || !appleClientId || !appleRedirectUri}>
        <span className="apple-mark">●</span> {appleBusy ? 'Đang kết nối Apple…' : 'Tiếp tục với Apple'}
      </button>
      {(!appleClientId || !appleRedirectUri) && <p className="provider-note">Apple: cần Services ID và domain HTTPS đã đăng ký trong Apple Developer.</p>}
    </div>
  );
}
