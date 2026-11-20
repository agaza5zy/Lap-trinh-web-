import { useEffect, useRef, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { getAppleNonceApi, getGoogleNonceApi } from '../api/auth';

/**
 * Load a third-party script safely, including when another mount has already
 * inserted the script element but it has not finished loading yet.
 * The previous implementation resolved immediately whenever the element
 * existed. Under React StrictMode/remounts that could leave the Google slot
 * empty because window.google was not ready at that moment.
 */
function loadScript(src, id, isReady, timeoutMs = 12000) {
  if (isReady()) return Promise.resolve();

  return new Promise((resolve, reject) => {
    let script = document.getElementById(id);
    let timer;
    let settled = false;
    const startedAt = Date.now();

    const finish = (callback, value) => {
      if (settled) return;
      settled = true;
      if (timer) window.clearTimeout(timer);
      if (script) script.removeEventListener('error', handleError);
      callback(value);
    };

    const handleError = () => {
      finish(reject, new Error('Trình duyệt không tải được thư viện đăng nhập Google/Apple.'));
    };

    if (!script) {
      script = document.createElement('script');
      script.id = id;
      script.src = src;
      script.async = true;
      script.defer = true;
    }

    script.addEventListener('error', handleError, { once: true });

    const checkReady = () => {
      if (isReady()) {
        finish(resolve);
        return;
      }
      if (Date.now() - startedAt >= timeoutMs) {
        finish(reject, new Error('Dịch vụ đăng nhập Google không phản hồi. Hãy kiểm tra kết nối mạng và cấu hình Google OAuth.'));
        return;
      }
      timer = window.setTimeout(checkReady, 50);
    };

    // Start polling before appending so even a fast script load is observed.
    checkReady();
    if (!document.getElementById(id)) document.head.appendChild(script);
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
  const [googleStatus, setGoogleStatus] = useState('loading');
  const [googleError, setGoogleError] = useState('');
  const [googleAttempt, setGoogleAttempt] = useState(0);

  const googleClientId = String(import.meta.env.VITE_GOOGLE_CLIENT_ID || '').trim();
  const appleClientId = String(import.meta.env.VITE_APPLE_CLIENT_ID || '').trim();
  const appleRedirectUri = String(import.meta.env.VITE_APPLE_REDIRECT_URI || '').trim();

  useEffect(() => {
    let active = true;

    if (!googleClientId) {
      setGoogleStatus('missing');
      setGoogleError('');
      return () => { active = false; };
    }

    const buttonContainer = googleRef.current;
    if (!buttonContainer) return () => { active = false; };

    setGoogleStatus('loading');
    setGoogleError('');

    async function initializeGoogle() {
      try {
        await loadScript(
          'https://accounts.google.com/gsi/client',
          'google-identity-services',
          () => Boolean(window.google?.accounts?.id),
        );
        if (!active) return;

        const { nonce, csrfToken } = await getGoogleNonceApi();
        if (!active) return;

        window.google.accounts.id.initialize({
          client_id: googleClientId,
          nonce,
          callback: async (response) => {
            try {
              if (!response?.credential) throw new Error('Google không trả về thông tin xác thực. Vui lòng thử lại.');
              await loginWithGoogle(response.credential, nonce, csrfToken);
              window.location.assign('/account');
            } catch (error) {
              onError?.(error.response?.data?.message || error.message || 'Đăng nhập Google thất bại.');
            }
          },
          auto_select: false,
          cancel_on_tap_outside: true,
        });

        buttonContainer.replaceChildren();
        window.google.accounts.id.renderButton(buttonContainer, {
          theme: 'outline',
          size: 'large',
          shape: 'rectangular',
          text: 'continue_with',
          width: Math.min(320, Math.max(200, buttonContainer.clientWidth || 320)),
          logo_alignment: 'left',
        });

        if (!active) return;
        setGoogleStatus('ready');
      } catch (error) {
        if (!active) return;
        setGoogleStatus('error');
        setGoogleError(error.response?.data?.message || error.message || 'Không thể khởi tạo đăng nhập Google.');
      }
    }

    initializeGoogle();
    return () => { active = false; };
  }, [googleClientId, googleAttempt, loginWithGoogle, onError]);

  async function signInApple() {
    if (!appleClientId || !appleRedirectUri) {
      return onError?.('Cần cấu hình VITE_APPLE_CLIENT_ID và VITE_APPLE_REDIRECT_URI (HTTPS domain).');
    }
    setAppleBusy(true);
    try {
      await loadScript(
        'https://appleid.cdn-apple.com/appleauth/static/jsapi/appleid.auth.js',
        'apple-signin-js',
        () => Boolean(window.AppleID?.auth),
      );
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
    } finally {
      setAppleBusy(false);
    }
  }

  return (
    <div className="social-auth">
      {googleClientId ? (
        <>
          <div className="google-button-wrap" aria-live="polite">
            <div ref={googleRef} />
            {googleStatus === 'loading' && <span className="provider-note">Đang tải đăng nhập Google…</span>}
          </div>
          {googleStatus === 'error' && (
            <div className="provider-note provider-error" role="alert">
              <span>{googleError}</span>
              <button type="button" className="provider-retry" onClick={() => setGoogleAttempt((value) => value + 1)}>
                Thử tải lại Google
              </button>
            </div>
          )}
        </>
      ) : (
        <p className="provider-note provider-error">
          Google chưa được cấu hình. Hãy thêm VITE_GOOGLE_CLIENT_ID vào Environment Variables của Vercel rồi deploy lại.
        </p>
      )}

      <button
        type="button"
        className="social-button apple-button"
        onClick={signInApple}
        disabled={appleBusy || !appleClientId || !appleRedirectUri}
      >
        <span className="apple-mark">●</span> {appleBusy ? 'Đang kết nối Apple…' : 'Tiếp tục với Apple'}
      </button>
      {(!appleClientId || !appleRedirectUri) && (
        <p className="provider-note">Apple: cần Services ID và domain HTTPS đã đăng ký trong Apple Developer.</p>
      )}
    </div>
  );
}
