import { Router, type Request, type Response } from 'express';
import * as oidc from 'openid-client';
import { db, usersTable } from '@workspace/db';
import { GetCurrentAuthUserResponse, ConfirmProfileBody } from '@workspace/api-zod';
import { clearSession, createSession, getOidcConfig, getSession, getSessionId, updateSession, SESSION_COOKIE, SESSION_TTL } from '../lib/auth';
import { profileName } from '../lib/profile-name';
import { eq } from 'drizzle-orm';

const router = Router();
const cookieOptions = { httpOnly: true, secure: true, sameSite: 'lax' as const, path: '/' };
const flowCookies = ['code_verifier', 'nonce', 'state', 'return_to'];

function origin(req: Request) {
  const host = req.get('x-forwarded-host') || req.get('host');
  if (!host || /[\s/\\]/.test(host)) throw new Error('Invalid host');
  return `https://${host}`;
}

// Local paths only, including after decoding: disallow protocol-relative and backslash redirects.
function safeReturn(value: unknown, fallback = '/') {
  if (typeof value !== 'string') return fallback;
  try {
    const decoded = decodeURIComponent(value);
    if (!decoded.startsWith('/') || decoded.startsWith('//') || /[\\\r\n]/.test(decoded)) return fallback;
    return value;
  } catch { return fallback; }
}

function clearFlow(res: Response, suffix = '') {
  for (const name of flowCookies) res.clearCookie(name + suffix, cookieOptions);
}

router.use((_req, res, next) => {
  res.set('Cache-Control', 'no-store');
  next();
});

router.get('/auth/user', async (req, res) => {
  // Repair existing sessions as well as new logins without requiring a logout.
  if (req.isAuthenticated() && !req.user.firstName?.trim() && !req.user.lastName?.trim()) {
    const sid = getSessionId(req);
    const session = sid ? await getSession(sid) : null;
    if (sid && session && Date.now() - (session.profileCheckedAt ?? 0) > 5 * 60 * 1000) {
      try {
        const config = await getOidcConfig();
        const info = await oidc.fetchUserInfo(config, session.access_token, req.user.id);
        const names = profileName(info);
        if (names.firstName || names.lastName) {
          session.user = { ...session.user, ...names };
          await db.update(usersTable).set({ ...names, updatedAt: new Date() }).where(eq(usersTable.id, req.user.id));
          req.user = session.user;
        }
      } catch (error) {
        req.log.warn({ errorName: error instanceof Error ? error.name : 'Error' }, 'Account profile lookup unavailable');
      }
      session.profileCheckedAt = Date.now();
      await updateSession(sid, session);
    }
  }
  res.json(GetCurrentAuthUserResponse.parse({ user: req.isAuthenticated() ? req.user : null }));
});

router.post('/auth/profile', async (req, res) => {
  if (!req.isAuthenticated()) { res.status(401).json({ error: 'يلزم تسجيل الدخول.' }); return; }
  const source = req.get('origin');
  let allowed = req.get('sec-fetch-site') !== 'cross-site';
  try { if (source) allowed &&= new URL(source).host === (req.get('x-forwarded-host') || req.get('host')); }
  catch { allowed = false; }
  if (!allowed) { res.sendStatus(403); return; }
  const parsed = ConfirmProfileBody.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: 'أدخل الاسم الأول والاسم الثاني.' }); return; }
  const names = { firstName: parsed.data.firstName.trim(), lastName: parsed.data.lastName.trim() };
  if (Object.values(names).some((name) => !name || /[\u0000-\u001f\u007f]/.test(name))) {
    res.status(400).json({ error: 'أدخل اسمين صالحين.' }); return;
  }
  const sid = getSessionId(req);
  const session = sid ? await getSession(sid) : null;
  if (!sid || !session) { res.sendStatus(401); return; }
  await db.update(usersTable).set({ ...names, updatedAt: new Date() }).where(eq(usersTable.id, req.user.id));
  session.user = { ...session.user, ...names, profileConfirmed: true };
  await updateSession(sid, session);
  res.json(GetCurrentAuthUserResponse.parse({ user: session.user }));
});

router.get('/login', async (req, res) => {
  try {
    const config = await getOidcConfig();
    const state = oidc.randomState();
    const nonce = oidc.randomNonce();
    const verifier = oidc.randomPKCECodeVerifier();
    const url = oidc.buildAuthorizationUrl(config, {
      redirect_uri: `${origin(req)}/api/callback`,
      scope: 'openid email profile offline_access',
      code_challenge: await oidc.calculatePKCECodeChallenge(verifier),
      code_challenge_method: 'S256',
      prompt: 'login consent',
      state, nonce,
    });
    const values = [verifier, nonce, state, safeReturn(req.query.returnTo, '/home')];
    // Separate cookies per authorization attempt: another tab or repeated click
    // must not overwrite the verifier for a still-valid login.
    flowCookies.forEach((name, i) => res.cookie(`${name}_${state}`, values[i], { ...cookieOptions, maxAge: 10 * 60 * 1000 }));
    res.redirect(url.href);
  } catch (error) {
    req.log.error({ errorName: error instanceof Error ? error.name : 'Error' }, 'Login unavailable');
    res.redirect('/?authError=unavailable');
  }
});

router.get('/callback', async (req, res) => {
  const callbackState = typeof req.query.state === 'string' && /^[\w-]{16,128}$/.test(req.query.state) ? req.query.state : '';
  const suffix = callbackState && req.cookies?.[`state_${callbackState}`] ? `_${callbackState}` : '';
  const verifier = req.cookies?.[`code_verifier${suffix}`];
  const nonce = req.cookies?.[`nonce${suffix}`];
  const state = req.cookies?.[`state${suffix}`];
  const returnTo = safeReturn(req.cookies?.[`return_to${suffix}`], '/home');
  clearFlow(res, suffix);
  if (!verifier || !nonce || !state) {
    res.redirect('/?authError=expired');
    return;
  }
  try {
    const config = await getOidcConfig();
    const callback = new URL(`${origin(req)}${req.originalUrl}`);
    const tokens = await oidc.authorizationCodeGrant(config, callback, {
      pkceCodeVerifier: verifier, expectedNonce: nonce, expectedState: state, idTokenExpected: true,
    });
    const claims = tokens.claims();
    if (!claims?.sub) throw new Error('Missing subject');
    const nullableString = (value: unknown) => typeof value === 'string' ? value : null;
    const [existing] = await db.select().from(usersTable).where(eq(usersTable.id, claims.sub));
    const claimedNames = profileName(claims);
    const user = {
      id: claims.sub, email: nullableString(claims.email),
      firstName: existing?.firstName || claimedNames.firstName,
      lastName: existing?.lastName || claimedNames.lastName,
      profileImageUrl: nullableString(claims.profile_image_url ?? claims.picture),
      profileConfirmed: false,
    };
    await db.insert(usersTable).values(user).onConflictDoUpdate({
      target: usersTable.id, set: { ...user, updatedAt: new Date() },
    });
    const oldSid = getSessionId(req);
    if (oldSid) await clearSession(res, oldSid);
    const sid = await createSession({
      user, access_token: tokens.access_token, refresh_token: tokens.refresh_token,
      expires_at: tokens.expiresIn() ? Math.floor(Date.now() / 1000) + tokens.expiresIn()! : claims.exp,
    });
    res.cookie(SESSION_COOKIE, sid, { ...cookieOptions, maxAge: SESSION_TTL });
    res.redirect(returnTo);
  } catch (error) {
    const code = error instanceof oidc.AuthorizationResponseError ? error.error : (error as { code?: string })?.code;
    // Log only the bounded protocol error code; never callback URLs or tokens.
    const safeCode = typeof code === 'string' && /^[A-Z_a-z]{1,80}$/.test(code) ? code : 'unknown';
    req.log.warn({ errorName: error instanceof Error ? error.name : 'Error', code: safeCode }, 'Login verification failed');
    res.redirect(`/?authError=${safeCode === 'access_denied' ? 'denied' : 'failed'}`);
  }
});

router.get('/logout', async (req, res) => {
  await clearSession(res, getSessionId(req));
  clearFlow(res);
  try {
    const config = await getOidcConfig();
    res.redirect(oidc.buildEndSessionUrl(config, {
      client_id: process.env.REPL_ID!,
      post_logout_redirect_uri: `${origin(req)}${safeReturn(req.query.returnTo)}`,
    }).href);
  } catch {
    // The local session is already invalidated even if the provider is unavailable.
    res.redirect('/');
  }
});

export default router;
