import type { AuthUser } from '@workspace/api-zod';
import type { NextFunction, Request, Response } from 'express';
import { db, usersTable, passwordCredentialsTable } from '@workspace/db';
import { eq } from 'drizzle-orm';
import { clearSession, getSession, getSessionId } from '../lib/auth';

declare global {
  namespace Express {
    interface User extends AuthUser {}
    interface Request {
      isAuthenticated(): this is AuthedRequest;
      user?: User | undefined;
    }
    interface AuthedRequest { user: User }
  }
}

export async function authMiddleware(req: Request, res: Response, next: NextFunction) {
  req.isAuthenticated = function (this: Request) { return this.user != null; } as Request['isAuthenticated'];
  const sid = getSessionId(req);
  if (!sid) { next(); return; }
  const session = await getSession(sid);
  if (!session?.user?.id) { await clearSession(res, sid); next(); return; }
  // Existing non-expired site sessions remain valid for safe password activation.
  // No identity-provider redirects or refresh requests are made.
  const [user] = await db.select().from(usersTable).where(eq(usersTable.id, session.user.id));
  if (!user) { await clearSession(res, sid); next(); return; }
  const [credential] = await db.select({ id: passwordCredentialsTable.userId }).from(passwordCredentialsTable).where(eq(passwordCredentialsTable.userId, user.id));
  req.user = {
    id: user.id, email: user.email, name: user.name,
    firstName: user.firstName, lastName: user.lastName,
    profileImageUrl: user.profileImageUrl, jobDescription: user.jobDescription,
    profileConfirmed: true, passwordEnabled: !!credential,
  };
  next();
}
