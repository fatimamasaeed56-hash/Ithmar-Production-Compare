import { ArrowDown, ArrowLeft, Cpu, Factory, GraduationCap, Info, Package, RefreshCw, TriangleAlert } from 'lucide-react';
import { PasswordForm } from '@/components/password-form';
import { Button } from '@/components/ui/button';
import { useEffect, useRef, useState } from 'react';

type Props = {
  isAuthenticated: boolean;
  isLoading: boolean;
  error?: string | null;
  onLogin: () => void;
  onEnter: () => void;
  onRetry: () => void;
};

const GOALS = [
  { icon: Factory, title: 'مقارنة الإنتاج', body: 'قارن مدخلات المواد والإنتاج السليم والخردة وأوقات تغيير القالب بين تشغيلين.' },
  { icon: Package, title: 'استيراد سجلات CSV', body: 'راجع ملفات التصدير مع تنبيهات للقيم الناقصة والصفوف المكررة.' },
  { icon: Cpu, title: 'تتبّع كل رقم', body: 'ارجع من المؤشر إلى صف المصدر وقيمه الأصلية دون تعديل نظام شركتك.' },
  { icon: GraduationCap, title: 'أرشيف خاص بحسابك', body: 'احتفظ بملفاتك وملاحظاتك وسجل تعديلاتك للرجوع إليها عند الحاجة.' },
];

const EN_GOALS = [
  { icon: Factory, title: 'Compare production', body: 'Compare material inputs, good output, scrap and mold-change time between two runs.' },
  { icon: Package, title: 'Import CSV records', body: 'Review exported files with warnings for missing values and duplicate rows.' },
  { icon: Cpu, title: 'Trace every number', body: 'Open the original source row behind each metric without modifying your company’s system.' },
  { icon: GraduationCap, title: 'Your private archive', body: 'Keep files, notes and change history in your account for future reference.' },
];

export default function WelcomePage({ isAuthenticated, isLoading, error, onLogin, onEnter, onRetry }: Props) {
  const [language, setLanguage] = useState<'ar' | 'en'>(() =>
    new URLSearchParams(window.location.search).get('lang') === 'en' ? 'en' : 'ar',
  );
  const [mode, setMode] = useState<'login' | 'signup'>(() =>
    window.location.pathname.endsWith('/signup') ? 'signup' : 'login',
  );
  const ar = language === 'ar';
  const t = (arabic: string, english: string) => ar ? arabic : english;
  useEffect(() => {
    const root = document.documentElement;
    const previous = { lang: root.lang, dir: root.dir, title: document.title };
    root.lang = language;
    root.dir = language === 'ar' ? 'rtl' : 'ltr';
    document.title = language === 'ar'
      ? 'مقارنة سجلات الإنتاج — أهلاً بكم'
      : 'Production Comparison — Welcome';
    return () => {
      root.lang = previous.lang;
      root.dir = previous.dir;
      document.title = previous.title;
    };
  }, [language]);
  const panelRef = useRef<HTMLElement>(null);
  const focusPanel = () => {
    const el = panelRef.current;
    if (!el) return;
    el.scrollIntoView({ behavior: 'smooth', block: 'start' });
    window.setTimeout(() => el.querySelector<HTMLButtonElement>('[data-panel-primary]')?.focus({ preventScroll: true }), 350);
  };
  const switchLanguage = () => {
    const next = ar ? 'en' : 'ar';
    const url = new URL(window.location.href);
    url.searchParams.set('lang', next);
    window.history.replaceState(window.history.state, '', url);
    setLanguage(next);
  };
  return (
    <div dir={ar ? 'rtl' : 'ltr'} lang={language} className="relative min-h-[100dvh] overflow-x-hidden bg-background">
      <div aria-hidden className="paper-grid pointer-events-none absolute inset-0 opacity-50 [mask-image:radial-gradient(ellipse_at_top,black,transparent_70%)]" />
      <div aria-hidden className="absolute inset-x-0 top-0 z-10 h-1.5 bg-primary" />

      <div className="relative mx-auto max-w-[1440px] px-4 pb-10 pt-6 sm:px-6 lg:px-10">
        <header className="rise flex items-center justify-between gap-4">
          <span className="text-lg font-semibold text-primary sm:text-xl">{t('مقارنة سجلات الإنتاج', 'Production Comparison')}</span>
          <Button variant="outline" onClick={switchLanguage} aria-label={ar ? 'Switch to English' : 'التبديل إلى العربية'} lang={ar ? 'en' : 'ar'} data-testid="button-language">
            {ar ? 'English' : 'العربية'}
          </Button>
        </header>

        <div className="mt-6 grid gap-5 lg:grid-cols-[1.35fr_1fr]">
          <section className="rise relative isolate flex min-h-[560px] flex-col overflow-hidden rounded-xl border bg-[hsl(146_30%_18%)] text-white">
            <img src={`${import.meta.env.BASE_URL}welcome-line.jpg`} alt="" aria-hidden className="absolute inset-0 -z-20 h-full w-full object-cover" />
            <div aria-hidden className={`absolute inset-0 -z-10 ${ar ? 'bg-gradient-to-l' : 'bg-gradient-to-r'} from-[hsl(146_35%_14%/.94)] via-[hsl(146_32%_18%/.78)] to-[hsl(146_30%_20%/.25)]`} />
            <div className="flex flex-1 flex-col p-6 sm:p-10">
              <p className="w-fit rounded-full bg-white/15 px-3 py-1 text-xs font-semibold tracking-wide text-[hsl(95_60%_85%)]">{t('أداة للشركات وفرق الإنتاج', 'For companies and production teams')}</p>
              <h1 className="mt-5 max-w-xl text-3xl font-bold leading-tight sm:text-4xl lg:text-5xl">
                {t('أهلاً بكم في أداة', 'Welcome to')}
                <span className="block text-[hsl(95_55%_75%)]">{t('مقارنة سجلات الإنتاج', 'Production Comparison')}</span>
              </h1>
              <Button size="lg" onClick={focusPanel} className="mt-6 w-fit bg-white text-[hsl(146_31%_26%)] hover:bg-white/90" data-testid="button-get-started">
                {t('ابدأ الآن', 'Get started')} <ArrowDown className="size-4 lg:hidden" /><ArrowLeft className={`hidden size-4 lg:block ${ar ? '' : 'rotate-180'}`} />
              </Button>

              <div className="mt-auto pt-10">
                <h2 className="flex items-center gap-3 text-sm font-semibold"><span className="h-px w-8 bg-white/60" /> {t('ما تقدمه الأداة', 'What you can do')}</h2>
                <ol className="mt-4 grid gap-px overflow-hidden rounded-lg border border-white/15 bg-white/15 sm:grid-cols-2">
                  {(ar ? GOALS : EN_GOALS).map((g, i) => (
                    <li key={g.title} className="rise bg-[hsl(146_32%_14%/.72)] p-4 backdrop-blur-sm" style={{ animationDelay: `${120 + i * 80}ms` }} data-testid={`card-goal-${i}`}>
                      <div className="flex items-center justify-between">
                        <g.icon className="size-5 text-[hsl(95_55%_75%)]" aria-hidden />
                        <span className="num text-xs text-white/60">0{i + 1}</span>
                      </div>
                      <h3 className="mt-2 font-semibold">{g.title}</h3>
                      <p className="mt-1 text-sm leading-6 text-white/75">{g.body}</p>
                    </li>
                  ))}
                </ol>
                <p className="mt-3 text-[11px] text-white/65">{t('الصورة توضيحية ولا تمثل شركة بعينها.', 'Illustrative image; it does not represent a specific company.')}</p>
                <details className="mt-3 rounded-md border border-white/15 bg-white/10 px-4 py-3 text-sm" data-testid="details-goals-original">
                  <summary className="cursor-pointer select-none font-medium">{t('عن المنصة', 'About the platform')}</summary>
                  <p dir={ar ? 'rtl' : 'ltr'} lang={language} className="mt-3 text-start leading-7 text-white/80">
                    {t(
                      'منصة عامة لمراجعة صادرات الإنتاج المعتمدة ومقارنة مؤشراتها. تستخدم بيانات الملفات التي تستوردها، مع تتبّع المصدر وحفظ الملاحظات في حسابك، دون تعديل نظام إدارة الأعمال الأصلي.',
                      'A general-purpose platform for reviewing approved production exports and comparing their metrics. Work with your imported files, trace values to their sources and save notes in your account without modifying the original business management system.',
                    )}
                  </p>
                </details>
              </div>
            </div>
          </section>

          <aside ref={panelRef} className="rise grid scroll-mt-4 overflow-hidden rounded-xl border bg-card sm:grid-cols-[0.8fr_1.2fr] lg:grid-cols-1 xl:grid-cols-[0.75fr_1.25fr]" style={{ animationDelay: '120ms' }} data-testid="login-panel">
            <div className="flex flex-col justify-between gap-6 bg-secondary p-6">
              <p className="text-lg font-semibold text-primary">{t('مساحة عمل الإنتاج', 'Production workspace')}</p>
              <div>
                <p className="font-semibold text-secondary-foreground">{t('أهلاً بعودتك', 'Welcome back')}</p>
                <p className="mt-1 text-sm leading-6 text-muted-foreground">{t('ادخل ببريدك الإلكتروني وكلمة المرور للوصول إلى مقارنة سجلات الإنتاج.', 'Sign in with your email and password to reach production comparison.')}</p>
              </div>
            </div>
            <div className="flex flex-col justify-center p-6 sm:p-8">
            {!isAuthenticated && (
              <div className="mb-2 grid grid-cols-2 gap-2" role="group" aria-label={t('خيارات الحساب', 'Account options')}>
                <Button variant={mode === 'login' ? 'default' : 'outline'} aria-pressed={mode === 'login'} onClick={() => setMode('login')} data-testid="tab-login">
                  {t('تسجيل الدخول', 'Log in')}
                </Button>
                <Button variant={mode === 'signup' ? 'default' : 'outline'} aria-pressed={mode === 'signup'} onClick={() => setMode('signup')} data-testid="tab-signup">
                  {t('إنشاء حساب', 'Create account')}
                </Button>
              </div>
            )}
            <h2 className="mt-5 text-xl font-bold">{mode === 'signup' && !isAuthenticated ? t('إنشاء حساب جديد', 'Create your account') : t('تسجيل الدخول', 'Log in')}</h2>

            {isLoading ? (
              <div className="mt-4 space-y-3" data-testid="status-auth-loading" aria-busy="true">
                <div className="h-3 w-3/4 animate-pulse rounded bg-muted" />
                <div className="h-3 w-1/2 animate-pulse rounded bg-muted" />
                <Button disabled className="mt-4 w-full" size="lg" data-testid="button-login-loading">
                  <RefreshCw className="size-4 animate-spin" /> {t('جارٍ التحقق من الجلسة…', 'Checking your session…')}
                </Button>
              </div>
            ) : error ? (
              <div className="mt-4" data-testid="status-auth-error">
                <div role="alert" className="flex gap-2 rounded-md border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive">
                  <TriangleAlert className="mt-0.5 size-4 shrink-0" aria-hidden />
                  <span>{ar ? error : 'We could not verify your login. Please try again.'}</span>
                </div>
                <div className="mt-5 grid gap-2">
                  <Button size="lg" data-panel-primary onClick={onRetry} data-testid="button-retry">
                    <RefreshCw className="size-4" /> {t('إعادة المحاولة', 'Try again')}
                  </Button>
                </div>
              </div>
            ) : isAuthenticated ? (
              <div className="mt-4" data-testid="status-auth-ok">
                <p className="text-sm leading-7 text-muted-foreground">{t('تم تسجيل دخولك. يمكنك الآن متابعة مراجعة سجلات الإنتاج.', 'You are logged in. You can now review production records.')}</p>
                <Button size="lg" className="mt-6 w-full" data-panel-primary onClick={onEnter} data-testid="button-enter">
                  {t('الانتقال إلى الرئيسية', 'Go to home')} <ArrowLeft className={`size-4 ${ar ? '' : 'rotate-180'}`} />
                </Button>
              </div>
            ) : (
              <div className="mt-4" key={mode}>
                <p className="mb-4 text-sm leading-7 text-muted-foreground">
                  {mode === 'signup'
                    ? t('أنشئ حسابك بالبريد الإلكتروني وكلمة مرور قوية، ثم تنتقل إلى الصفحة الرئيسية.', 'Create your account with your email and a strong password, then continue to home.')
                    : t('سجّل دخولك بالبريد الإلكتروني وكلمة المرور للوصول إلى الرئيسية وسجلات المصدر.', 'Log in with your email and password to access home and source records.')}
                </p>
                <div className="rise"><PasswordForm mode={mode} language={language} onSuccess={onLogin} /></div>
                <p className="mt-4 flex gap-2 rounded-md bg-muted/60 p-3 text-xs leading-5 text-muted-foreground" data-testid="text-recovery-note">
                  <Info className="mt-0.5 size-3.5 shrink-0" aria-hidden />
                  {t('استعادة كلمة المرور عبر البريد الإلكتروني غير مفعّلة حاليًا. احفظ كلمة مرورك في مكان آمن.', 'Password recovery by email is not enabled yet. Keep your password somewhere safe.')}
                </p>
              </div>
            )}

            </div>
          </aside>
        </div>
      </div>
    </div>
  );
}
