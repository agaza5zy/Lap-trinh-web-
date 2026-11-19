import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { appleLoginApi, getMeApi, googleLoginApi, loginApi, registerApi, verifyEmailApi } from '../api/auth';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(() => Boolean(localStorage.getItem('token')));

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) return;
    getMeApi().then((data) => setUser(data.user)).catch(() => {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
    }).finally(() => setLoading(false));
  }, []);

  const saveSession = useCallback((data) => {
    localStorage.setItem('token', data.token);
    localStorage.setItem('user', JSON.stringify(data.user));
    setUser(data.user);
    return data.user;
  }, []);
  const login = useCallback(async (credentials) => saveSession(await loginApi(credentials)), [saveSession]);
  const verifyEmail = useCallback(async (token) => saveSession(await verifyEmailApi(token)), [saveSession]);
  const loginWithGoogle = useCallback(async (credential, nonce, csrfToken) => saveSession(await googleLoginApi(credential, nonce, csrfToken)), [saveSession]);
  const loginWithApple = useCallback(async (payload) => saveSession(await appleLoginApi(payload)), [saveSession]);
  const logout = useCallback(() => {
    setUser(null);
    localStorage.removeItem('token');
    localStorage.removeItem('user');
  }, []);

  const value = useMemo(() => ({
    user, loading, login, register: registerApi, verifyEmail, loginWithGoogle, loginWithApple, logout,
  }), [user, loading, login, verifyEmail, loginWithGoogle, loginWithApple, logout]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export const useAuth = () => useContext(AuthContext);
