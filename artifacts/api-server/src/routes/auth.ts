import { Router, type Request, type Response } from 'express';
import { randomUUID } from 'node:crypto';
import { db, passwordCredentialsTable, usersTable, type User } from '@workspace/db';
import { eq, sql } from 'drizzle-orm';
import { GetCurrentAuthUserResponse, LoginAccountBody, RegisterAccountBody, ActivatePasswordBody } from '@workspace/api-zod';
import { clearSession, createSession, getSessionId, SESSION_COOKIE, SESSION_TTL } from '../lib/auth';
import { hashPassword, strongPassword, verifyPassword } from '../lib/passwords';
import { allowAuthAttempt, safeAuthPost } from '../lib/auth-limits';

const router = Router();
const cookieOptions = { httpOnly: true, secure: true, sameSite: 'lax' as const, path: '/' };
const publicUser = (user: User, passwordEnabled = true) => ({
  id: user.id, email: user.email, name: user.name,
  firstName: user.firstName, lastName: user.lastName,
  profileImageUrl: user.profileImageUrl, jobDescription: user.jobDescription,
  profileConfirmed: true, passwordEnabled,
});
async function signedIn(req: Request, res: Response, user: User, status = 200) {
  const profile = publicUser(user);
  const sid = await createSession({ user: profile, kind: 'password' });
  await clearSession(res, getSessionId(req));
  res.cookie(SESSION_COOKIE, sid, { ...cookieOptions, maxAge: SESSION_TTL });
  res.status(status).json(GetCurrentAuthUserResponse.parse({ user: profile }));
}
function registrationData(body: { email: string; name: string; password: string; jobDescription: string }) {
  return { ...body, email: body.email.trim().toLowerCase(), name: body.name.trim(), jobDescription: body.jobDescription.trim() };
}
function validFields(data: ReturnType<typeof registrationData>, res: Response) {
  if (!data.name || !data.jobDescription || /[\u0000-\u001f\u007f]/.test(data.name + data.jobDescription) || !strongPassword(data.password)) {
    res.status(400).json({ error: 'أكمل الاسم والوصف الوظيفي، واستخدم كلمة مرور من 9 أحرف على الأقل تحتوي حروفًا وأرقامًا ورموزًا.' });
    return false;
  }
  return true;
}
function authFailure(req: Request, res: Response, error: unknown) {
  const e = error as { code?: string; cause?: { code?: string } };
  if (e.code === '23505' || e.cause?.code === '23505') {
    res.status(409).json({ error: 'لا يمكن إنشاء حساب بهذا البريد. استخدم تسجيل الدخول إن كان لديك حساب.' });
    return;
  }
  // No error objects or request bodies: credentials must never reach logs.
  req.log.error('Password authentication operation failed');
  res.status(503).json({ error: 'تعذر إكمال العملية. أعد المحاولة لاحقًا.' });
}
router.use((_req, res, next) => { res.set('Cache-Control', 'no-store'); next(); });
router.use(['/auth/register', '/auth/login', '/auth/logout', '/auth/password'], safeAuthPost);

router.get('/auth/user', async (req, res) => {
  res.json(GetCurrentAuthUserResponse.parse({ user: req.isAuthenticated() ? req.user : null }));
});

router.post('/auth/register', async (req, res) => {
  const parsed = RegisterAccountBody.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: 'تحقق من البريد وحقول التسجيل المطلوبة.' }); return; }
  const data = registrationData(parsed.data);
  if (!validFields(data, res)) return;
  try {
    if (!await allowAuthAttempt(req, res, data.email, true)) return;
    // Do not attach a new password to a legacy identity merely because its email matches.
    const [existing] = await db.select({ id: usersTable.id }).from(usersTable).where(sql`lower(${usersTable.email}) = ${data.email}`).limit(1);
    if (existing) { res.status(409).json({ error: 'لا يمكن إنشاء حساب بهذا البريد. إن كنت داخل حسابك القديم، فعّل كلمة المرور من «حسابي».' }); return; }
    const passwordHash = await hashPassword(data.password);
    const user = await db.transaction(async (tx) => {
      const [created] = await tx.insert(usersTable).values({
        id: randomUUID(), email: data.email, name: data.name,
        firstName: data.name, lastName: null, jobDescription: data.jobDescription,
      }).returning();
      await tx.insert(passwordCredentialsTable).values({ email: data.email, userId: created.id, passwordHash });
      return created;
    });
    await signedIn(req, res, user, 201);
  } catch (error) { authFailure(req, res, error); }
});

router.post('/auth/login', async (req, res) => {
  const parsed = LoginAccountBody.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: 'أدخل البريد وكلمة المرور.' }); return; }
  const email = parsed.data.email.trim().toLowerCase();
  try {
    if (!await allowAuthAttempt(req, res, email)) return;
    const [credential] = await db.select().from(passwordCredentialsTable).where(eq(passwordCredentialsTable.email, email));
    const valid = await verifyPassword(parsed.data.password, credential?.passwordHash);
    if (!valid || !credential) { res.status(401).json({ error: 'البريد أو كلمة المرور غير صحيحة.' }); return; }
    const [user] = await db.select().from(usersTable).where(eq(usersTable.id, credential.userId));
    if (!user) { res.status(401).json({ error: 'البريد أو كلمة المرور غير صحيحة.' }); return; }
    await signedIn(req, res, user);
  } catch (error) { authFailure(req, res, error); }
});

router.post('/auth/password', async (req, res) => {
  if (!req.isAuthenticated()) { res.sendStatus(401); return; }
  const parsed = ActivatePasswordBody.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: 'تحقق من البيانات المطلوبة.' }); return; }
  const data = registrationData(parsed.data);
  if (!validFields(data, res)) return;
  if (!req.user.email || req.user.email.trim().toLowerCase() !== data.email) { res.status(400).json({ error: 'لا يمكن تغيير بريد الحساب عند تفعيل كلمة المرور.' }); return; }
  try {
    if (!await allowAuthAttempt(req, res, data.email, true)) return;
    const passwordHash = await hashPassword(data.password);
    const user = await db.transaction(async (tx) => {
      // Unique userId prevents this endpoint from resetting an existing password.
      await tx.insert(passwordCredentialsTable).values({ userId: req.user!.id, email: data.email, passwordHash });
      const [updated] = await tx.update(usersTable).set({
        name: data.name, firstName: data.name, lastName: null,
        jobDescription: data.jobDescription, updatedAt: new Date(),
      }).where(eq(usersTable.id, req.user!.id)).returning();
      return updated;
    });
    await signedIn(req, res, user);
  } catch (error) { authFailure(req, res, error); }
});

router.post('/auth/logout', async (req, res) => {
  await clearSession(res, getSessionId(req));
  res.json(GetCurrentAuthUserResponse.parse({ user: null }));
});

// Old bookmarks now lead to the local form, never Google or Replit.
router.get('/login', (_req, res) => res.redirect('/login'));
router.get('/callback', (_req, res) => res.redirect('/login'));
router.get('/logout', (_req, res) => res.redirect('/login'));
export default router;
