import { test } from 'node:test';
import assert from 'node:assert/strict';
import { nextSourceMidnight, sourceDay, todaysSources } from './source-workspace.ts';

test('schedules the exact midnight millisecond in summer, winter and at year rollover', () => {
  for (const [now, expected] of [
    ['2026-10-10T20:59:59.999Z', '2026-10-10T21:00:00.000Z'],
    ['2026-10-10T21:00:00.000Z', '2026-10-11T21:00:00.000Z'],
    ['2026-12-31T12:00:00.000Z', '2026-12-31T22:00:00.000Z'],
  ]) {
    const boundary = nextSourceMidnight(new Date(now));
    assert.equal(new Date(boundary).toISOString(), expected);
    assert.equal(sourceDay(boundary - 1), sourceDay(now));
    assert.notEqual(sourceDay(boundary), sourceDay(now));
  }
});

test('midnight remains the next local day boundary around Palestine DST transitions', () => {
  for (const day of ['2026-03-27', '2026-03-28', '2026-10-23', '2026-10-24']) {
    const now = new Date(`${day}T00:00:00Z`);
    const boundary = nextSourceMidnight(now);
    assert.equal(sourceDay(boundary - 1), sourceDay(now));
    assert.notEqual(sourceDay(boundary), sourceDay(now));
    assert.equal(new Intl.DateTimeFormat('en-GB', { timeZone: 'Asia/Hebron', hour: '2-digit', minute: '2-digit', second: '2-digit', hourCycle: 'h23' }).format(boundary), '00:00:00');
  }
});

test('Palestine midnight closes yesterday views, independent of browser timezone', () => {
  const windows = { demo: { openedAt: '2026-10-10T20:55:00Z', closed: false } };
  assert.equal(sourceDay('2026-10-10T20:59:59Z'), '2026-10-10');
  assert.deepEqual(todaysSources(windows, new Date('2026-10-10T20:59:59Z')), windows);
  assert.deepEqual(todaysSources(windows, new Date('2026-10-10T21:00:00Z')), {});
  assert.equal(sourceDay('2026-12-31T22:00:00Z'), '2027-01-01');
});

test('same-day closed windows persist while old or invalid entries are ignored', () => {
  const current = { openedAt: '2026-10-11T10:00:00Z', closed: true };
  assert.deepEqual(todaysSources({
    current,
    yesterday: { openedAt: '2026-10-10T10:00:00Z', closed: false },
    invalid: { openedAt: 'invalid', closed: false },
  }, new Date('2026-10-11T12:00:00Z')), { current });
});
