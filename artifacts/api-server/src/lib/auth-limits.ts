import { createHash } from 'node:crypto';
import type { Request, Response } from 'express';
import { db, authLimitsTable } from '@workspace/db';
import { sql } from 'drizzle-orm';

async function consume(scope: string, value: string, maximum: number) {
  const key = `${scope}:${createHash('sha256').update(value).digest('hex')}`;
  const [row] = await db.insert(authLimitsTable).values({ key, attempts: 1 }).onConflictDoUpdate({
    target: authLimitsTable.key,
    set: {
      attempts: sql`CASE WHEN ${authLimitsTable.windowStart} < NOW() - INTERVAL '15 minutes' THEN 1 ELSE ${authLimitsTable.attempts} + 1 END`,
      windowStart: sql`CASE WHEN ${authLimitsTable.windowStart} < NOW() - INTERVAL '15 minutes' THEN NOW() ELSE ${authLimitsTable.windowStart} END`,
    },
  }).returning({ attempts: authLimitsTable.attempts });
  return row.attempts <= maximum;
}
export async function allowAuthAttempt(req: Request, res: Response, email: string, registration = false) {
  const ipAllowed = await consume(registration ? 'signup-ip' : 'login-ip', req.ip ?? 'unknown', registration ? 12 : 50);
  const emailAllowed = ipAllowed && await consume(registration ? 'signup-email' : 'login-email', email, registration ? 6 : 12);
  if (!ipAllowed || !emailAllowed) {
    res.set('Retry-After', '900').status(429).json({ error: 'محاولات كثيرة. انتظر 15 دقيقة ثم أعد المحاولة.' });
    return false;
  }
  return true;
}
export function safeAuthPost(req: Request, res: Response, next: () => void) {
  if (req.method !== 'POST') { next(); return; }
  const origin = req.get('origin');
  let foreign = req.get('sec-fetch-site') === 'cross-site';
  try { if (origin) foreign ||= new URL(origin).host !== (req.get('x-forwarded-host') || req.get('host')); }
  catch { foreign = true; }
  if (foreign || !req.is('application/json')) { res.status(403).json({ error: 'طلب غير مسموح.' }); return; }
  next();
}
