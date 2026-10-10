import type { AuthUser } from '@workspace/replit-auth-web';
import type { AuthUser as ApiAuthUser } from '@workspace/api-client-react';
import { UserRound, Mail, LogOut, ArrowRight, BriefcaseBusiness, KeyRound, ShieldCheck } from 'lucide-react';
import { Link } from 'wouter';
import { Button } from '@/components/ui/button';
import { PasswordForm } from '@/components/password-form';

export default function AccountPage({ user, onLogout }: { user: AuthUser; onLogout: () => void }) {
  const u = user as AuthUser & Partial<ApiAuthUser>;
  const legacyName = [u.firstName, u.lastName].filter(Boolean).join(' ');
  const name = u.name?.trim() || legacyName;
  return (
    <section className="mx-auto max-w-2xl space-y-6" aria-labelledby="account-title">
      <Link href="/home" className="inline-flex items-center gap-2 text-sm text-primary">
        <ArrowRight className="size-4" /> العودة إلى الرئيسية
      </Link>
      <div className="rounded-lg border bg-card p-6 sm:p-8">
        <div className="flex items-center gap-4">
          <div className="flex size-14 items-center justify-center rounded-full bg-secondary text-primary"><UserRound className="size-7" aria-hidden /></div>
          <div>
            <h1 id="account-title" className="text-2xl font-bold">حسابي <span lang="en" className="text-base font-medium text-muted-foreground">· My account</span></h1>
            <p className="mt-1 text-sm text-muted-foreground">بيانات الحساب المرتبط بجلسة الدخول الحالية</p>
          </div>
        </div>
        <dl className="mt-8 space-y-5">
          <div>
            <dt className="text-sm text-muted-foreground">الاسم <span lang="en">· Name</span></dt>
            <dd className="mt-1 font-medium" data-testid="account-name">{name || 'الاسم غير متاح'}</dd>
          </div>
          <div>
            <dt className="flex items-center gap-2 text-sm text-muted-foreground"><Mail className="size-4" aria-hidden />البريد الإلكتروني <span lang="en">· Email</span></dt>
            <dd className="mt-1 break-all font-medium" data-testid="account-email"><bdi>{u.email || 'البريد الإلكتروني غير متاح'}</bdi></dd>
          </div>
          <div>
            <dt className="flex items-center gap-2 text-sm text-muted-foreground"><BriefcaseBusiness className="size-4" aria-hidden />الوصف الوظيفي <span lang="en">· Job description</span></dt>
            <dd className="mt-1 font-medium" data-testid="account-job">{u.jobDescription?.trim() || 'غير محدد بعد'}</dd>
          </div>
          {u.passwordEnabled && (
            <div className="flex items-center gap-2 rounded-md bg-secondary px-3 py-2 text-sm text-secondary-foreground" data-testid="status-password-enabled">
              <ShieldCheck className="size-4" aria-hidden /> الدخول بالبريد وكلمة المرور مفعّل <span lang="en" className="text-muted-foreground">· Password sign-in enabled</span>
            </div>
          )}
        </dl>

        {!u.passwordEnabled && (
          <div className="rise mt-8 rounded-lg border border-primary/25 bg-secondary/40 p-5 sm:p-6" data-testid="section-activate-password">
            <h2 className="flex items-center gap-2 text-lg font-bold"><KeyRound className="size-5 text-primary" aria-hidden />تفعيل الدخول بكلمة المرور</h2>
            <p lang="en" className="text-sm font-medium text-muted-foreground">Activate password sign-in</p>
            <p className="mt-3 text-sm leading-7 text-muted-foreground">
              أنشئ كلمة مرور لحسابك الحالي. تبقى ملفاتك وسجلاتك مرتبطة بهذا الحساب نفسه، ولا يمكن تفعيلها إلا من الحساب المسجّل دخوله الآن.
            </p>
            <p lang="en" dir="ltr" className="mt-1 text-start text-xs leading-6 text-muted-foreground">
              Set a password for the account you are signed in to now. Your existing files stay with this same account; activation only applies to the current session's account.
            </p>
            <div className="mt-5">
              <PasswordForm mode="activate" language="ar" initialEmail={u.email ?? ''} initialName={name} initialJob={u.jobDescription ?? ''}
                onSuccess={() => window.location.reload()} />
            </div>
          </div>
        )}

        <div className="mt-8 border-t pt-5">
          <Button variant="outline" onClick={onLogout} data-testid="account-logout"><LogOut className="size-4" />تسجيل الخروج <span lang="en">· Log out</span></Button>
        </div>
      </div>
    </section>
  );
}
