import { useCallback, useEffect, useState } from 'react';
import { nextSourceMidnight, sourceDay, todaysSources, type SourceWindows } from './source-workspace';

/** Only view metadata is local; files and notes remain in the account archive. */
export function useSourceWorkspace(userId: string) {
  const key = `ethmar-source-windows:${userId}`;
  const [storageError, setStorageError] = useState(false);
  const [windows, setWindows] = useState<SourceWindows>(() => {
    try {
      const parsed: unknown = JSON.parse(localStorage.getItem(key) ?? '{}');
      return parsed && typeof parsed === 'object' && !Array.isArray(parsed)
        ? todaysSources(parsed as SourceWindows) : {};
    } catch { return {}; }
  });
  const [day, setDay] = useState(() => sourceDay(new Date()));
  useEffect(() => {
    let timer: ReturnType<typeof setTimeout>;
    const refreshDay = () => {
      clearTimeout(timer);
      const now = new Date();
      setDay(sourceDay(now));
      timer = setTimeout(refreshDay, Math.max(1, nextSourceMidnight(now) - Date.now()));
    };
    refreshDay();
    window.addEventListener('focus', refreshDay);
    document.addEventListener('visibilitychange', refreshDay);
    return () => {
      clearTimeout(timer);
      window.removeEventListener('focus', refreshDay);
      document.removeEventListener('visibilitychange', refreshDay);
    };
  }, []);
  useEffect(() => {
    try {
      localStorage.setItem(key, JSON.stringify(todaysSources(windows)));
      setStorageError(false);
    } catch { setStorageError(true); }
  }, [key, windows, day]);

  const open = useCallback((id: string) => {
    const now = new Date();
    setDay(sourceDay(now));
    setWindows((old) => ({
      ...todaysSources(old, now), [id]: { openedAt: now.toISOString(), closed: false },
    }));
  }, []);
  const close = useCallback((id: string) => {
    setWindows((old) => old[id] ? { ...old, [id]: { ...old[id], closed: true } } : old);
  }, []);
  return { windows, day, open, close, storageError };
}
