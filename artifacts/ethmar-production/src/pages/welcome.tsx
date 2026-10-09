import { ArrowLeft, Cpu, Factory, GraduationCap, LogIn, Package, RefreshCw, ShieldCheck, TriangleAlert } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useState } from 'react';

type Props = {
  isAuthenticated: boolean;
  isLoading: boolean;
  error?: string | null;
  onLogin: () => void;
  onEnter: () => void;
  onRetry: () => void;
};

const GOALS = [
  { icon: Factory, title: 'قاعدة إنتاجية متينة', body: 'نسعى إلى بناء قاعدة إنتاج قوية تكون أساساً راسخاً لعملنا.' },
  { icon: Package, title: 'خدمة السوق المحلي', body: 'نطمح إلى تقديم خدمات محلية للسوق في جميع أنواع العبوات البلاستيكية، بأعلى معايير الجودة وأفضل الأسعار.' },
  { icon: Cpu, title: 'اختيار المنتج مع العميل', body: 'نعمل على أن يختار العميل منتجه بنفسه، مع استخدام أجهزة CNC متقدمة في تنفيذ المنتجات.' },
  { icon: GraduationCap, title: 'تدريب متكامل', body: 'نهدف إلى توفير تدريب كامل على أجهزة CNC المتقدمة وعلى المنتجات كذلك.' },
];

const EN_GOALS = [
  { icon: Factory, title: 'A strong production base', body: 'We aim to build a strong production base as a solid foundation for our work.' },
  { icon: Package, title: 'Serving the local market', body: 'We aspire to provide local services for all types of plastic packaging, with the highest quality standards and the best prices.' },
  { icon: Cpu, title: 'Customer product selection', body: 'We work to support customers in choosing their products, using advanced CNC equipment in production.' },
  { icon: GraduationCap, title: 'Comprehensive training', body: 'We aim to provide full training on advanced CNC equipment and products.' },
];

export default function WelcomePage({ isAuthenticated, isLoading, error, onLogin, onEnter, onRetry }: Props) {
  const [language, setLanguage] = useState<'ar' | 'en'>('ar');
  const ar = language === 'ar';
  const t = (arabic: string, english: string) => ar ? arabic : english;
  return (
    <div dir={ar ? 'rtl' : 'ltr'} lang={language} className="relative min-h-[100dvh] overflow-hidden bg-background">
      <div aria-hidden className="paper-grid pointer-events-none absolute inset-0 opacity-60 [mask-image:radial-gradient(ellipse_at_top,black,transparent_70%)]" />
      <div aria-hidden className="absolute inset-x-0 top-0 z-10 h-1.5 bg-primary" />

      <div className="relative mx-auto grid min-h-[100dvh] max-w-[1440px] md:grid-cols-[1.25fr_1fr] md:items-stretch">
        <section className="rise px-5 py-12 sm:px-8 lg:px-14">
          <img
            src={`${import.meta.env.BASE_URL}ithmar-logo.png`}
            alt={t('إثمار للصناعات البلاستيكية', 'Ithmar Plastic Industries')}
            width={819}
            height={331}
            className="h-auto w-56 sm:w-72"
            data-testid="img-logo"
          />
          <p className="mt-8 text-xs font-semibold tracking-wide text-primary">{t('إثمار للصناعات البلاستيكية', 'Ithmar Plastic Industries')}</p>
          <h1 className="mt-2 text-3xl font-bold leading-tight text-foreground sm:text-4xl lg:text-5xl">
            {t('أهلاً بكم في أداة', 'Welcome to')}
            <span className="block text-primary">{t('مقارنة سجلات الإنتاج', 'Production Comparison')}</span>
          </h1>

          <h2 className="mt-10 flex items-center gap-3 text-sm font-semibold text-foreground">
            <span className="h-px w-8 bg-primary" /> {t('تطلعاتنا', 'Our goals')}
          </h2>
          <ol className="mt-4 grid gap-px overflow-hidden rounded-md border bg-border sm:grid-cols-2">
            {(ar ? GOALS : EN_GOALS).map((g, i) => (
              <li key={g.title} className="rise bg-card p-5" style={{ animationDelay: `${120 + i * 80}ms` }} data-testid={`card-goal-${i}`}>
                <div className="flex items-center justify-between">
                  <g.icon className="size-5 text-primary" aria-hidden />
                  <span className="num text-xs text-muted-foreground">0{i + 1}</span>
                </div>
                <h3 className="mt-3 font-semibold">{g.title}</h3>
                <p className="mt-1.5 text-sm leading-7 text-muted-foreground">{g.body}</p>
              </li>
            ))}
          </ol>
          <p className="mt-3 text-[11px] text-muted-foreground">{t('تُعرض هذه البنود بوصفها أهدافاً وتطلعات للشركة، لا شهادات أو إحصاءات.', 'These are company goals and aspirations, not certifications or statistics.')}</p>

          <details className="group mt-4 rounded-md border bg-card/60 px-4 py-3 text-sm" data-testid="details-goals-original">
            <summary className="cursor-pointer select-none font-medium text-primary">{t('أهداف الشركة', 'Company goals')}</summary>
            <p dir={ar ? 'rtl' : 'ltr'} lang={language} className="mt-3 text-start leading-7 text-muted-foreground">
              {t(
                'تركّز الشركة على بناء قاعدة إنتاجية قوية ووكالة تعمل على تزويد السوق المحلي بخدمات محلية في جميع أنواع العبوات البلاستيكية، بأعلى معايير الجودة وأفضل الأسعار، إضافةً إلى إتاحة اختيار المنتجات للعميل وتقديم تدريب متكامل باستخدام أجهزة CNC المتقدمة على المنتجات كذلك.',
                'The company focuses on building a strong production base and an agency that works to provide the local market with local services in all types of plastic packaging with the highest quality standards and the best prices, in addition to any product selection before the customer and full training by advanced CNC devices on the products as well',
              )}
            </p>
          </details>
        </section>

        <aside className="order-first flex min-h-[100dvh] flex-col border-s bg-card px-6 py-6 md:order-none sm:px-8 lg:px-12" data-testid="login-panel">
          <div className="flex justify-end">
            <Button variant="outline" onClick={() => setLanguage(ar ? 'en' : 'ar')} aria-label={ar ? 'Switch to English' : 'التبديل إلى العربية'} lang={ar ? 'en' : 'ar'} data-testid="button-language">
              {ar ? 'English' : 'العربية'}
            </Button>
          </div>
          <div className="my-auto py-10">
            <div className="flex size-11 items-center justify-center rounded-md bg-secondary text-primary">
              <ShieldCheck className="size-5" aria-hidden />
            </div>
            <h2 className="mt-5 text-xl font-bold">{t('تسجيل الدخول', 'Log in')}</h2>

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
                  <Button size="lg" onClick={onRetry} data-testid="button-retry">
                    <RefreshCw className="size-4" /> {t('إعادة المحاولة', 'Try again')}
                  </Button>
                  <Button size="lg" variant="outline" onClick={onLogin} data-testid="button-login">
                    <LogIn className="size-4" /> {t('تسجيل الدخول', 'Log in')}
                  </Button>
                </div>
              </div>
            ) : isAuthenticated ? (
              <div className="mt-4" data-testid="status-auth-ok">
                <p className="text-sm leading-7 text-muted-foreground">{t('تم تسجيل دخولك. يمكنك الآن متابعة مراجعة سجلات الإنتاج.', 'You are logged in. You can now review production records.')}</p>
                <Button size="lg" className="mt-6 w-full" onClick={onEnter} data-testid="button-enter">
                  {t('الدخول إلى الأداة', 'Open comparison')} <ArrowLeft className={`size-4 ${ar ? '' : 'rotate-180'}`} />
                </Button>
              </div>
            ) : (
              <div className="mt-4">
                <p className="text-sm leading-7 text-muted-foreground">
                  {t('سجّل دخولك بأمان للوصول إلى المقارنة وسجلات المصدر. ستنتقل إلى صفحة التحقق من هويتك.', 'Log in securely to access comparisons and source records. You will be redirected to verify your identity.')}
                </p>
                <Button size="lg" className="mt-6 w-full" onClick={onLogin} data-testid="button-login">
                  <LogIn className="size-4" /> {t('تسجيل الدخول', 'Log in')}
                </Button>
              </div>
            )}

            <p className="mt-6 border-t pt-4 text-[11px] leading-6 text-muted-foreground">
              {t('للقراءة فقط · ملفات CSV تُقرأ داخل المتصفح ولا تُرسل أو تُحفظ. يُحفظ فقط ما يلزم للحساب وجلسة الدخول.', 'Read-only · CSV files are read in your browser, never uploaded or saved. Only account and login session information is stored.')}
            </p>
          </div>
        </aside>
      </div>
    </div>
  );
}
