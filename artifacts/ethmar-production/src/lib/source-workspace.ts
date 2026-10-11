export const SOURCE_TIME_ZONE = 'Asia/Hebron';
export type SourceWindow = { openedAt: string; closed: boolean };
export type SourceWindows = Record<string, SourceWindow>;

export function sourceDay(value: string | number | Date) {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: SOURCE_TIME_ZONE, year: 'numeric', month: '2-digit', day: '2-digit',
  }).format(new Date(value));
}

/** First millisecond of the next Palestine day, including DST offset changes. */
export function nextSourceMidnight(now = new Date()): number {
  const today = sourceDay(now);
  let low = now.getTime();
  let high = low + 27 * 60 * 60 * 1000;
  while (high - low > 1) {
    const middle = Math.floor((low + high) / 2);
    if (sourceDay(middle) === today) low = middle;
    else high = middle;
  }
  return high;
}

export function todaysSources(windows: SourceWindows, now = new Date()): SourceWindows {
  return Object.fromEntries(Object.entries(windows).filter(([, entry]) =>
    entry && typeof entry.openedAt === 'string' && typeof entry.closed === 'boolean'
    && Number.isFinite(Date.parse(entry.openedAt)) && sourceDay(entry.openedAt) === sourceDay(now)));
}
