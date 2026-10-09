import type { AuthUser } from '@workspace/replit-auth-web';
import { UserRound, Mail, LogOut, ArrowRight } from 'lucide-react';
import { Link } from 'wouter';
import { Button } from '@/components/ui/button';

export default function AccountPage({ user, onLogout }: { user: AuthUser; onLogout: () => void }) {
  const name = [user.firstName, user.lastName].filter(Boolean).join(' ');
  return (
    <section className="mx-auto max-w-2xl space-y-6" aria-labelledby="account-title">
      <Link href="/home" className="inline-flex items-center gap-2 text-sm text-primary">
        <ArrowRight className="size-4" /> العودة إلى الرئيسية
      </Link>
      <div className="rounded-lg border bg-card p-6 sm:p-8">
        <div className="flex items-center gap-4">
          <div className="flex size-14 items-center justify-center rounded-full bg-secondary text-primary"><UserRound className="size-7" aria-hidden /></div>
          <div>
            <h1 id="account-title" className="text-2xl font-bold">حسابي</h1>
            <p className="mt-1 text-sm text-muted-foreground">بيانات الحساب المرتبط بجلسة الدخول الحالية</p>
          </div>
        </div>
        <dl className="mt-8 space-y-5">
          <div>
            <dt className="text-sm text-muted-foreground">الاسم</dt>
            <dd className="mt-1 font-medium" data-testid="account-name">{name || 'الاسم غير متاح من خدمة المصادقة'}</dd>
          </div>
          <div>
            <dt className="flex items-center gap-2 text-sm text-muted-foreground"><Mail className="size-4" aria-hidden />البريد الإلكتروني</dt>
            <dd className="mt-1 break-all font-medium" data-testid="account-email"><bdi>{user.email || 'البريد الإلكتروني غير متاح من خدمة المصادقة'}</bdi></dd>
          </div>
        </dl>
        <div className="mt-8 border-t pt-5">
          <Button variant="outline" onClick={onLogout} data-testid="account-logout"><LogOut className="size-4" />تسجيل الخروج</Button>
        </div>
      </div>
    </section>
  );
}
