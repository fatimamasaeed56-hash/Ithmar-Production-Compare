import { ArrowLeft, Cpu, Factory, GraduationCap, LogIn, Package, RefreshCw, ShieldCheck, TriangleAlert } from 'lucide-react';
import { Button } from '@/components/ui/button';

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

export default function WelcomePage({ isAuthenticated, isLoading, error, onLogin, onEnter, onRetry }: Props) {
  return (
    <div dir="rtl" className="relative min-h-[100dvh] overflow-hidden bg-background">
      <div aria-hidden className="paper-grid pointer-events-none absolute inset-0 opacity-60 [mask-image:radial-gradient(ellipse_at_top,black,transparent_70%)]" />
      <div aria-hidden className="absolute inset-x-0 top-0 h-1.5 bg-primary" />

      <div className="relative mx-auto grid max-w-6xl gap-10 px-4 py-10 md:grid-cols-[1.25fr_1fr] md:items-start md:py-16 lg:gap-16">
        <section className="rise">
          <img
            src={`${import.meta.env.BASE_URL}ithmar-logo.png`}
            alt="Ithmar Plastic Industries — إثمار للصناعات البلاستيكية"
            width={819}
            height={331}
            className="h-auto w-56 sm:w-72"
            data-testid="img-logo"
          />
          <p className="mt-8 text-xs font-semibold tracking-wide text-primary">إثمار للصناعات البلاستيكية</p>
          <h1 className="mt-2 text-3xl font-bold leading-tight text-foreground sm:text-4xl lg:text-5xl">
            أهلاً بكم في أداة
            <span className="block text-primary">مقارنة سجلات الإنتاج</span>
          </h1>
          <p className="mt-4 max-w-xl text-base leading-8 text-muted-foreground">
            مساحة للقراءة فقط لمراجعة سجلات الإنتاج ومقارنتها، مع إمكانية الرجوع إلى السجل الأصلي لكل رقم.
          </p>

          <h2 className="mt-10 flex items-center gap-3 text-sm font-semibold text-foreground">
            <span className="h-px w-8 bg-primary" /> تطلعاتنا
          </h2>
          <ol className="mt-4 grid gap-px overflow-hidden rounded-md border bg-border sm:grid-cols-2">
            {GOALS.map((g, i) => (
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
          <p className="mt-3 text-[11px] text-muted-foreground">تُعرض هذه البنود بوصفها أهدافاً وتطلعات للشركة، لا شهادات أو إحصاءات.</p>

          <details className="group mt-4 rounded-md border bg-card/60 px-4 py-3 text-sm" data-testid="details-goals-original">
            <summary className="cursor-pointer select-none font-medium text-primary">النص الأصلي بالإنجليزية</summary>
            <p dir="ltr" lang="en" className="mt-3 text-left leading-7 text-muted-foreground">
              The company focuses on building a strong production base and an agency that works to provide the local market with local services in all types of plastic packaging with the highest quality standards and the best prices, in addition to any product selection before the customer and full training by advanced CNC devices on the products as well
            </p>
          </details>
        </section>

        <aside className="rise md:sticky md:top-10" style={{ animationDelay: '200ms' }}>
          <div className="rounded-lg border bg-card p-6 shadow-[0_24px_48px_-28px_hsl(var(--primary)/0.45)] sm:p-8">
            <div className="flex size-11 items-center justify-center rounded-md bg-secondary text-primary">
              <ShieldCheck className="size-5" aria-hidden />
            </div>
            <h2 className="mt-5 text-xl font-bold">تسجيل الدخول</h2>

            {isLoading ? (
              <div className="mt-4 space-y-3" data-testid="status-auth-loading" aria-busy="true">
                <div className="h-3 w-3/4 animate-pulse rounded bg-muted" />
                <div className="h-3 w-1/2 animate-pulse rounded bg-muted" />
                <Button disabled className="mt-4 w-full" size="lg" data-testid="button-login-loading">
                  <RefreshCw className="size-4 animate-spin" /> جارٍ التحقق من الجلسة…
                </Button>
              </div>
            ) : error ? (
              <div className="mt-4" data-testid="status-auth-error">
                <div role="alert" className="flex gap-2 rounded-md border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive">
                  <TriangleAlert className="mt-0.5 size-4 shrink-0" aria-hidden />
                  <span>{error}</span>
                </div>
                <div className="mt-5 grid gap-2">
                  <Button size="lg" onClick={onRetry} data-testid="button-retry">
                    <RefreshCw className="size-4" /> إعادة المحاولة
                  </Button>
                  <Button size="lg" variant="outline" onClick={onLogin} data-testid="button-login">
                    <LogIn className="size-4" /> تسجيل الدخول
                  </Button>
                </div>
              </div>
            ) : isAuthenticated ? (
              <div className="mt-4" data-testid="status-auth-ok">
                <p className="text-sm leading-7 text-muted-foreground">تم تسجيل دخولك. يمكنك الآن متابعة مراجعة سجلات الإنتاج.</p>
                <Button size="lg" className="mt-6 w-full" onClick={onEnter} data-testid="button-enter">
                  الدخول إلى الأداة <ArrowLeft className="size-4" />
                </Button>
              </div>
            ) : (
              <div className="mt-4">
                <p className="text-sm leading-7 text-muted-foreground">
                  سجّل دخولك بأمان للوصول إلى المقارنة وسجلات المصدر. ستنتقل إلى صفحة التحقق من هويتك.
                </p>
                <Button size="lg" className="mt-6 w-full" onClick={onLogin} data-testid="button-login">
                  <LogIn className="size-4" /> تسجيل الدخول
                </Button>
              </div>
            )}

            <p className="mt-6 border-t pt-4 text-[11px] leading-6 text-muted-foreground">
              للقراءة فقط · ملفات CSV تُقرأ داخل المتصفح ولا تُرسل أو تُحفظ. يُحفظ فقط ما يلزم للحساب وجلسة الدخول.
            </p>
          </div>
        </aside>
      </div>
    </div>
  );
}
