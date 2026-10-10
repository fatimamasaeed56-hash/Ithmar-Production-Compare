import { useCallback, useEffect, useState } from 'react';
import type { AuthUser } from '@workspace/api-client-react';

export type { AuthUser };

interface AuthState {
  user: AuthUser | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  login: () => void;
  logout: () => void;
  error: string | null;
  retry: () => void;
}

function getBasePath() {
  return import.meta.env.BASE_URL.replace(/\/+$/, '') || '/';
}

export function useAuth(): AuthState {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    let cancelled = false;

    const check = () => fetch('/api/auth/user', { credentials: 'include', cache: 'no-store' })
      .then((res) => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return res.json() as Promise<{ user: AuthUser | null }>;
      })
      .then((data) => {
        if (!cancelled) {
          setUser(data.user ?? null);
          setError(null);
          setIsLoading(false);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setUser(null);
          setError('تعذر التحقق من جلسة الدخول. يرجى إعادة المحاولة.');
          setIsLoading(false);
        }
      });

    check();
    const interval = window.setInterval(check, 60_000);
    const onFocus = () => { check(); };
    window.addEventListener('focus', onFocus);
    return () => {
      cancelled = true;
      window.clearInterval(interval);
      window.removeEventListener('focus', onFocus);
    };
  }, [attempt]);

  const login = useCallback(() => {
    const base = getBasePath();
    window.location.href = `${base === '/' ? '' : base}/login`;
  }, []);

  const logout = useCallback(async () => {
    const base = getBasePath();
    try {
      const response = await fetch('/api/auth/logout', {
        method: 'POST', credentials: 'include',
        headers: { 'Content-Type': 'application/json' }, body: '{}',
      });
      if (!response.ok) throw new Error('Logout failed');
      setUser(null);
      window.location.replace(base);
    } catch {
      window.alert('تعذر تسجيل الخروج. تحقق من الاتصال وأعد المحاولة؛ جلستك لم تُغلق بعد.');
    }
  }, []);

  return {
    user,
    isLoading,
    isAuthenticated: !!user,
    login,
    logout,
    error,
    retry: () => { setIsLoading(true); setAttempt((a) => a + 1); },
  };
}
