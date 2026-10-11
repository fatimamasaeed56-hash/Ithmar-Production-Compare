import { useState, type FormEvent } from 'react';
import { confirmProfile, type AuthUser } from '@workspace/api-client-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

export default function ConfirmName({ user, onSaved, onLogout }: { user: AuthUser; onSaved: () => void; onLogout: () => void }) {
  const [first, setFirst] = useState(user.firstName ?? '');
  const [last, setLast] = useState(user.lastName ?? '');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  async function save(event: FormEvent) {
    event.preventDefault();
    if (busy || !first.trim() || !last.trim()) return;
    setBusy(true); setError('');
    try {
      await confirmProfile({ firstName: first.trim(), lastName: last.trim() });
      onSaved();
    } catch {
      setError('تعذر حفظ الاسم. تأكد من اتصالك وأعد المحاولة، أو سجّل الدخول مجددًا.');
    } finally { setBusy(false); }
  }
  return <main dir="rtl" className="grid min-h-dvh place-items-center bg-background px-4 py-8">
    <section className="w-full max-w-md rounded-xl border border-primary/20 border-t-4 border-t-primary bg-card p-6 shadow-sm">
      <p className="mb-6 text-center text-lg font-semibold text-primary">مقارنة سجلات الإنتاج</p>
      <h1 className="text-xl font-bold text-primary">أهلًا بك، ما اسمك؟</h1>
      <p className="mt-2 text-sm leading-6 text-muted-foreground">أدخل الاسم الأول والاسم الثاني أو أكّدهما للمتابعة. نطلب تأكيد الاسم عند كل تسجيل دخول، حتى للحسابات المسجّلة سابقًا.</p>
      <form onSubmit={save} className="mt-6 space-y-4">
        <div><label htmlFor="profile-first" className="text-sm font-medium">الاسم الأول</label>
          <Input id="profile-first" data-testid="input-profile-first" autoComplete="given-name" value={first} onChange={(e) => setFirst(e.target.value)} maxLength={80} required disabled={busy} className="mt-2" /></div>
        <div><label htmlFor="profile-last" className="text-sm font-medium">الاسم الثاني</label>
          <Input id="profile-last" data-testid="input-profile-last" autoComplete="family-name" value={last} onChange={(e) => setLast(e.target.value)} maxLength={80} required disabled={busy} className="mt-2" /></div>
        {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
        <Button className="w-full" data-testid="button-confirm-profile" disabled={busy || !first.trim() || !last.trim()}>{busy ? 'جارٍ حفظ الاسم…' : 'حفظ ومتابعة'}</Button>
        <Button type="button" variant="ghost" className="w-full" onClick={onLogout} disabled={busy}>تسجيل الخروج واستخدام حساب آخر</Button>
      </form>
    </section>
  </main>;
}
