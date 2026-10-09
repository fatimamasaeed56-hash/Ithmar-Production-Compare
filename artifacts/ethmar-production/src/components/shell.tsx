import type { ReactNode } from 'react';
import { Link, useLocation } from 'wouter';
import { FileUp, Rows3, Scale, LogOut } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useStore } from '@/lib/store';
import { cn } from '@/lib/utils';
import { OriginBadge } from './bits';
import { SourceDetailDialog } from './source-detail-dialog';
import { ImportDialog } from './import-dialog';

const NAV = [
  { href: '/compare', label: 'المقارنة', icon: Scale },
  { href: '/sources', label: 'سجلات المصدر', icon: Rows3 },
];

export function Shell({ children, onLogout, userName, demo = false }: { children: ReactNode; onLogout: () => void; userName: string; demo?: boolean }) {
  const [loc] = useLocation();
  const { datasets, active, setActiveId, setImportOpen } = useStore();
  return (
    <div dir="rtl" className="min-h-[100dvh]">
      {demo && <div role="status" className="border-b bg-secondary px-4 py-3 text-center text-sm text-primary" data-testid="demo-banner">
        DEMO — تجربة غير محمية، وليست تسجيل دخول حقيقيًا. بيانات التجربة محلية ومنفصلة وتُمسح عند تحديث الصفحة أو الخروج.
      </div>}
      <header className="sticky top-0 z-30 border-b border-t-4 border-t-primary bg-background/95 backdrop-blur">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center gap-x-6 gap-y-2 px-4 py-3">
          <div className="flex items-center gap-3 max-sm:w-full">
            <Link href="/" aria-label="إثمار للصناعات البلاستيكية — الصفحة الرئيسية" className="shrink-0 rounded-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
              <img
                src={`${import.meta.env.BASE_URL}ithmar-logo.png`}
                alt="Ithmar Plastic Industries — إثمار للصناعات البلاستيكية"
                width={819}
                height={331}
                className="h-auto w-40 sm:w-48"
              />
            </Link>
            <span className="border-s border-border ps-3 text-xs font-medium text-primary">مقارنة سجلات الإنتاج</span>
          </div>
          <nav className="flex gap-1" aria-label="التنقل الرئيسي">
            {NAV.map((n) => (
              <Link
                key={n.href}
                href={`${demo ? '/demo' : ''}${n.href}`}
                data-testid={`link-${n.href === '/compare' ? 'compare' : 'sources'}`}
                aria-current={loc === `${demo ? '/demo' : ''}${n.href}` ? 'page' : undefined}
                className={cn(
                  'inline-flex items-center gap-1.5 rounded-sm px-2.5 py-1.5 text-sm transition-colors',
                  loc === `${demo ? '/demo' : ''}${n.href}` ? 'bg-primary text-primary-foreground' : 'hover:bg-muted',
                )}
              >
                <n.icon className="size-4" aria-hidden />
                {n.label}
              </Link>
            ))}
          </nav>
          <div className="ms-auto flex items-center gap-2">
            <span className="max-w-28 truncate text-xs text-muted-foreground" data-testid="user-name-display">{userName}</span>
            <Button size="sm" variant="outline" onClick={() => setImportOpen(true)} data-testid="button-open-import">
              <FileUp className="size-4" /> استيراد CSV
            </Button>
            <Button size="sm" variant="ghost" onClick={onLogout} data-testid="button-logout" aria-label="تسجيل الخروج">
              <LogOut className="size-4" /><span className="hidden sm:inline">{demo ? 'إنهاء التجربة' : 'خروج'}</span>
            </Button>
          </div>
        </div>
        <div className="border-t bg-muted/40">
          <div className="mx-auto flex max-w-6xl flex-wrap items-center gap-2 px-4 py-1.5 text-xs">
            <span className="text-muted-foreground">المصدر النشط:</span>
            <OriginBadge origin={active.origin} />
            <label className="sr-only" htmlFor="ds-switch">اختيار مجموعة البيانات</label>
            <select
              id="ds-switch"
              value={active.id}
              onChange={(e) => setActiveId(e.target.value)}
              data-testid="select-dataset"
              className="h-7 max-w-[min(60vw,28rem)] truncate rounded-sm border border-input bg-card px-2 text-xs focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              {datasets.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.title}
                </option>
              ))}
            </select>
            <span className="text-muted-foreground">
              {active.origin === 'user' ? 'نص رسالة — ليس ملف CSV ولا سجلاً معتمداً.' : 'معالج محلياً في هذه الجلسة — غير مُتحقق منه بشكل مستقل.'}
            </span>
          </div>
        </div>
      </header>
      <main className="mx-auto max-w-6xl px-4 py-6">{children}</main>
      <footer className="mx-auto max-w-6xl px-4 pb-8 text-[11px] text-muted-foreground">
        للقراءة فقط · لا تعديل ولا حذف لبيانات المصدر · كل رقم قابل للنقر لعرض سجله الأصلي.
      </footer>
      <SourceDetailDialog />
      <ImportDialog />
    </div>
  );
}
