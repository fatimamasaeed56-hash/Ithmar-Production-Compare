import { useId, useRef, useState, type FormEvent } from 'react';
import { Check, Circle, Eye, EyeOff, LogIn, RefreshCw, TriangleAlert, UserPlus, KeyRound } from 'lucide-react';
import { activatePassword, loginAccount, registerAccount } from '@workspace/api-client-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

export type PasswordFormMode = 'login' | 'signup' | 'activate';

type Props = {
  mode: PasswordFormMode;
  language: 'ar' | 'en';
  onSuccess: () => void;
  initialEmail?: string;
  initialName?: string;
  initialJob?: string;
};

export function passwordChecks(pw: string) {
  const len = [...pw].length;
  return {
    length: len >= 9 && len <= 128,
    letter: /\p{L}/u.test(pw),
    number: /\p{N}/u.test(pw),
    symbol: /[\p{P}\p{S}]/u.test(pw),
  };
}

function errorMessage(err: unknown, mode: PasswordFormMode, ar: boolean) {
  const status = typeof err === 'object' && err && 'status' in err ? Number((err as { status: unknown }).status) : 0;
  const t = (a: string, e: string) => (ar ? a : e);
  if (status === 401) return mode === 'activate'
    ? t('انتهت جلستك. سجّل الدخول من جديد ثم أعد المحاولة.', 'Your session has ended. Sign in again, then retry.')
    : t('البريد الإلكتروني أو كلمة المرور غير صحيحة.', 'Incorrect email or password.');
  if (status === 409) return mode === 'activate'
    ? t('كلمة المرور مفعّلة بالفعل لهذا الحساب، أو أن البريد مستخدم لحساب آخر.', 'A password is already enabled for this account, or the email belongs to another account.')
    : t('يوجد حساب مسجّل بهذا البريد الإلكتروني. سجّل الدخول بكلمة المرور بدلًا من ذلك.', 'An account with this email already exists. Log in with your password instead.');
  if (status === 429) return t('محاولات كثيرة خلال وقت قصير. انتظر قليلًا ثم حاول مجددًا.', 'Too many attempts. Please wait a moment and try again.');
  if (status === 400 || status === 422) return t('تحقّق من الحقول المدخلة ثم أعد المحاولة.', 'Please check the entered fields and try again.');
  if (!status) return t('تعذّر الاتصال بالخادم. تحقّق من اتصالك ثم أعد المحاولة.', 'Could not reach the server. Check your connection and retry.');
  return t('حدث خطأ غير متوقع. أعد المحاولة بعد قليل.', 'Something went wrong. Please try again shortly.');
}

export function PasswordForm({ mode, language, onSuccess, initialEmail = '', initialName = '', initialJob = '' }: Props) {
  const ar = language === 'ar';
  const t = (a: string, e: string) => (ar ? a : e);
  const id = useId();
  const [email, setEmail] = useState(initialEmail);
  const [name, setName] = useState(initialName);
  const [password, setPassword] = useState('');
  const [job, setJob] = useState(initialJob);
  const [show, setShow] = useState(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [touched, setTouched] = useState(false);
  const lock = useRef(false);

  const full = mode !== 'login';
  const checks = passwordChecks(password);
  const strong = checks.length && checks.letter && checks.number && checks.symbol;
  const emailOk = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());
  const valid = full
    ? emailOk && name.trim().length > 0 && strong && job.trim().length > 0
    : emailOk && password.length > 0 && password.length <= 128;

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setTouched(true);
    if (!valid || lock.current) return;
    lock.current = true;
    setPending(true);
    setError(null);
    try {
      if (mode === 'login') await loginAccount({ email: email.trim(), password });
      else {
        const body = { email: email.trim(), name: name.trim(), password, jobDescription: job.trim() };
        if (mode === 'signup') await registerAccount(body); else await activatePassword(body);
      }
      setPassword('');
      onSuccess();
    } catch (err) {
      setError(errorMessage(err, mode, ar));
    } finally {
      lock.current = false;
      setPending(false);
    }
  };

  const reqs: [keyof typeof checks, string][] = [
    ['length', t('9 أحرف على الأقل (حتى 128)', 'At least 9 characters (up to 128)')],
    ['letter', t('حرف واحد على الأقل', 'At least one letter')],
    ['number', t('رقم واحد على الأقل', 'At least one number')],
    ['symbol', t('رمز واحد على الأقل (مثل ! @ # ؟)', 'At least one symbol (e.g. ! @ # ?)')],
  ];
  const fieldErr = (cond: boolean) => touched && cond;

  return (
    <form onSubmit={submit} noValidate className="space-y-4" data-testid={`form-${mode}`} aria-busy={pending}>
      <div className="space-y-1.5">
        <Label htmlFor={`${id}-email`}>{t('البريد الإلكتروني', 'Email')}</Label>
        <Input id={`${id}-email`} type="email" inputMode="email" autoComplete="email" dir="ltr" required maxLength={254}
          value={email} onChange={(e) => setEmail(e.target.value)} readOnly={mode === 'activate'}
          aria-invalid={fieldErr(!emailOk)} className={mode === 'activate' ? 'bg-muted text-muted-foreground' : ''}
          data-testid="input-email" />
        {mode === 'activate' && <p className="text-xs text-muted-foreground">{t('البريد مرتبط بحسابك الحالي ولا يمكن تغييره هنا.', 'This email is tied to your current account and cannot be changed here.')}</p>}
        {fieldErr(!emailOk) && mode !== 'activate' && <p className="text-xs text-destructive">{t('أدخل بريدًا إلكترونيًا صالحًا.', 'Enter a valid email address.')}</p>}
      </div>

      {full && (
        <div className="space-y-1.5">
          <Label htmlFor={`${id}-name`}>{t('الاسم الكامل', 'Full name')}</Label>
          <Input id={`${id}-name`} autoComplete="name" required maxLength={160} value={name} onChange={(e) => setName(e.target.value)}
            aria-invalid={fieldErr(!name.trim())} data-testid="input-name" />
          {fieldErr(!name.trim()) && <p className="text-xs text-destructive">{t('الاسم مطلوب.', 'Name is required.')}</p>}
        </div>
      )}

      <div className="space-y-1.5">
        <Label htmlFor={`${id}-password`}>{t('كلمة المرور', 'Password')}</Label>
        <div className="relative">
          <Input id={`${id}-password`} type={show ? 'text' : 'password'} dir="ltr" required maxLength={128}
            autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
            value={password} onChange={(e) => setPassword(e.target.value)} className="pe-11"
            aria-describedby={full ? `${id}-reqs` : undefined} aria-invalid={fieldErr(full ? !strong : !password)}
            data-testid="input-password" />
          <button type="button" onClick={() => setShow((s) => !s)} aria-pressed={show} aria-controls={`${id}-password`}
            aria-label={show ? t('إخفاء كلمة المرور', 'Hide password') : t('إظهار كلمة المرور', 'Show password')}
            className="absolute inset-y-0 end-0 grid w-10 place-items-center rounded-e-md text-muted-foreground transition-colors hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            data-testid="button-toggle-password">
            {show ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
          </button>
        </div>
        {full ? (
          <ul id={`${id}-reqs`} className="grid gap-1 pt-1 text-xs sm:grid-cols-2" aria-live="polite" data-testid="list-password-requirements">
            {reqs.map(([k, label]) => (
              <li key={k} className={`flex items-center gap-1.5 transition-colors ${checks[k] ? 'text-primary' : touched ? 'text-destructive' : 'text-muted-foreground'}`}>
                {checks[k] ? <Check className="size-3.5 shrink-0" aria-hidden /> : <Circle className="size-3 shrink-0" aria-hidden />}
                <span>{label}<span className="sr-only">{checks[k] ? t(' — مستوفى', ' — met') : t(' — غير مستوفى', ' — not met')}</span></span>
              </li>
            ))}
          </ul>
        ) : fieldErr(!password) && <p className="text-xs text-destructive">{t('كلمة المرور مطلوبة.', 'Password is required.')}</p>}
      </div>

      {full && (
        <div className="space-y-1.5">
          <Label htmlFor={`${id}-job`}>{t('الوصف الوظيفي', 'Job description')}</Label>
          <Input id={`${id}-job`} autoComplete="organization-title" required maxLength={500} value={job} onChange={(e) => setJob(e.target.value)}
            placeholder={t('مثال: مشرف خط الإنتاج', 'e.g. Production line supervisor')} aria-invalid={fieldErr(!job.trim())} data-testid="input-job-description" />
          {fieldErr(!job.trim()) && <p className="text-xs text-destructive">{t('الوصف الوظيفي مطلوب.', 'Job description is required.')}</p>}
        </div>
      )}

      {error && (
        <div role="alert" className="flex gap-2 rounded-md border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive" data-testid="status-form-error">
          <TriangleAlert className="mt-0.5 size-4 shrink-0" aria-hidden /><span>{error}</span>
        </div>
      )}

      <Button type="submit" size="lg" className="w-full transition-transform active:scale-[.99]" disabled={pending || (mode !== 'login' && !strong)} data-panel-primary data-testid={`button-submit-${mode}`}>
        {pending ? <RefreshCw className="size-4 animate-spin" /> : mode === 'login' ? <LogIn className="size-4" /> : mode === 'signup' ? <UserPlus className="size-4" /> : <KeyRound className="size-4" />}
        {pending ? t('جارٍ الإرسال…', 'Submitting…')
          : mode === 'login' ? t('تسجيل الدخول', 'Log in')
          : mode === 'signup' ? t('إنشاء الحساب', 'Create account')
          : t('تفعيل كلمة المرور', 'Activate password')}
      </Button>
    </form>
  );
}
