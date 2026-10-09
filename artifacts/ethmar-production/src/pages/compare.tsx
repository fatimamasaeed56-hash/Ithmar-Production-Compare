import { useMemo } from 'react';
import { FileUp, Info } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { computeLine, diffMetric, LINES, METRIC_ROWS, type LineId, type LineMetrics } from '@/lib/data';
import { useStore } from '@/lib/store';
import { MetricButton } from '@/components/bits';
import { DataIssues } from '@/components/data-issues';
import { cn } from '@/lib/utils';

function LinePanel({ line, m, delay }: { line: LineId; m: LineMetrics; delay: number }) {
  const e1 = line === 'E-01';
  const { openTrace } = useStore();
  return (
    <section
      className="rise relative overflow-hidden rounded-md border bg-card"
      style={{ animationDelay: `${delay}ms` }}
      aria-label={`الخط ${line}`}
      data-testid={`panel-line-${line}`}
    >
      <div className={cn('absolute inset-y-0 start-0 w-1', e1 ? 'bg-e1' : 'bg-e2')} aria-hidden />
      <div className="flex items-center justify-between border-b px-5 py-3">
        <h2 className={cn('num text-lg font-semibold', e1 ? 'text-e1' : 'text-e2')}>{line}</h2>
        <span className="text-xs text-muted-foreground">سجل تشغيل</span>
      </div>
      <div className="grid grid-cols-2 gap-px bg-border">
        <div className="bg-card px-5 py-4">
          <div className="text-xs text-muted-foreground">نسبة المردود</div>
          <MetricButton m={m.yield} size="xl" />
        </div>
        <div className="bg-card px-5 py-4">
          <div className="text-xs text-muted-foreground">معدل الخردة</div>
          <MetricButton m={m.scrapRate} size="xl" />
          {m.scrapRate.substitution ? (
            <button
              type="button"
              dir="ltr"
              data-testid={`scrap-equation-${line}`}
              aria-label={`معادلة معدل الخردة ومصادرها — ${line}`}
              onClick={() => openTrace({ metric: m.scrapRate })}
              className="num mt-2 block w-full rounded-sm text-start text-xs leading-relaxed text-primary hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              {m.scrapRate.substitution}
            </button>
          ) : (
            <p className="mt-2 text-xs text-muted-foreground">{m.scrapRate.note}</p>
          )}
        </div>
      </div>
      {/* material bar */}
      {m.input.value && m.good.value !== null && m.scrap.value !== null ? (
        <div className="px-5 pt-4" aria-hidden>
          <div className="flex h-2 overflow-hidden rounded-full bg-muted">
            <div className={cn('h-full origin-right', e1 ? 'bg-e1' : 'bg-e2')} style={{ width: `${(m.good.value / m.input.value) * 100}%` }} />
            <div className="hatch h-full border-s border-background" style={{ width: `${(m.scrap.value / m.input.value) * 100}%` }} />
          </div>
        </div>
      ) : null}
      <dl className="grid grid-cols-2 gap-x-5 gap-y-3 px-5 py-4 text-sm sm:grid-cols-3">
        {(['input', 'good', 'scrap', 'mold', 'downtime', 'balance'] as const).map((k) => (
          <div key={k}>
            <dt className="text-[11px] text-muted-foreground">{METRIC_ROWS.find((r) => r.key === k)!.label}</dt>
            <dd>
              <MetricButton m={m[k]} testId={`button-panel-${line}-${k}`} />
            </dd>
          </div>
        ))}
      </dl>
    </section>
  );
}

export default function ComparePage() {
  const { active, byId, setImportOpen } = useStore();
  const lm = useMemo(() => {
    const r = {} as Record<LineId, LineMetrics>;
    LINES.forEach((l) => (r[l] = computeLine(active, l, byId)));
    return r;
  }, [active, byId]);

  const yd = diffMetric(lm['E-02'].yield, lm['E-01'].yield, 'yield', 'نسبة المردود');
  const sd = diffMetric(lm['E-02'].scrapRate, lm['E-01'].scrapRate, 'scrap-summary', 'معدل الخردة', 'E-02 − E-01');
  const md = diffMetric(lm['E-02'].mold, lm['E-01'].mold, 'mold-summary', 'مدة تغيير القالب', 'E-02 − E-01');

  return (
    <div className="space-y-6">
      <DataIssues dataset={active} />
      <div className="rise flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">مقارنة تشغيلين: E-01 مقابل E-02</h1>
          <p className="mt-1 text-sm text-muted-foreground">انقر أي رقم لعرض السجل والحقل والوحدة التي جاء منها، أو الصيغة التي اشتُق بها.</p>
        </div>
        <div className="rounded-md border bg-card px-4 py-2 text-sm">
          <div className="text-[11px] text-muted-foreground">فرق المردود (E-02 − E-01)</div>
          <MetricButton m={yd} signed size="lg" testId="button-headline-yield-diff" />
        </div>
      </div>

      <section className="rounded-md border bg-card p-4 text-sm space-y-2" aria-label="خلاصة الفروق">
        <p>معدل خردة E-02 {sd.value === null ? 'غير قابل للمقارنة' : sd.value > 0 ? 'أعلى' : sd.value < 0 ? 'أقل' : 'مساوٍ'} مقارنةً بـ E-01. الفرق: <MetricButton m={sd} signed testId="scrap-summary" /></p>
        <p>تغيير القالب في E-02 {md.value === null ? 'غير قابل للمقارنة' : md.value > 0 ? 'أطول' : md.value < 0 ? 'أقصر' : 'مساوٍ'} مقارنةً بـ E-01. الفرق: <MetricButton m={md} signed testId="mold-summary" /></p>
        <p className="text-muted-foreground">توقف E-02 غير المخطط: <MetricButton m={lm['E-02'].downtime} /> — سجل منفصل؛ لا يُجمع مع تغيير القالب، ولا يدل على أنه سبّب طول التغيير.</p>
      </section>

      <div className="grid gap-4 md:grid-cols-2">
        {LINES.map((l, i) => (
          <LinePanel key={l} line={l} m={lm[l]} delay={80 + i * 80} />
        ))}
      </div>

      <div className="flex justify-end">
        <Button variant="default" onClick={() => setImportOpen(true)} data-testid="button-open-import">
          <FileUp className="size-4" /> استيراد CSV
        </Button>
      </div>
      <section className="rise overflow-hidden rounded-md border bg-card" style={{ animationDelay: '240ms' }} aria-labelledby="tbl">
        <div className="flex items-center justify-between border-b px-4 py-3">
          <h2 id="tbl" className="text-sm font-semibold">جدول المقارنة</h2>
          <span className="flex items-center gap-3 text-[11px] text-muted-foreground">
            <span className="flex items-center gap-1"><span className="size-1.5 rounded-full bg-primary/60" /> خام</span>
            <span className="flex items-center gap-1"><span className="size-1.5 rounded-full border border-primary" /> مشتقة</span>
          </span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[560px] text-sm" data-testid="table-comparison">
            <thead>
              <tr className="border-b bg-muted/50 text-xs text-muted-foreground">
                <th scope="col" className="px-4 py-2 text-start font-medium">المقياس</th>
                <th scope="col" className="num px-4 py-2 text-start font-semibold text-e1">E-01</th>
                <th scope="col" className="num px-4 py-2 text-start font-semibold text-e2">E-02</th>
                <th scope="col" className="px-4 py-2 text-start font-medium">الفرق (E-02 − E-01)</th>
              </tr>
            </thead>
            <tbody>
              {METRIC_ROWS.map((r) => {
                const a = lm['E-01'][r.key];
                const b = lm['E-02'][r.key];
                const d = diffMetric(b, a, r.key, r.label);
                const sepBefore = r.key === 'mold';
                return (
                  <tr key={r.key} className={cn('border-b last:border-0 hover:bg-muted/30', sepBefore && 'border-t-2 border-t-border')}>
                    <th scope="row" className="px-4 py-2.5 text-start font-normal">
                      {r.label}
                      {r.key === 'downtime' && <span className="block text-[10px] text-muted-foreground">منفصل عن تغيير القالب</span>}
                    </th>
                    <td className="px-4 py-2.5"><MetricButton m={a} testId={`button-table-E-01-${r.key}`} /></td>
                    <td className="px-4 py-2.5"><MetricButton m={b} testId={`button-table-E-02-${r.key}`} /></td>
                    <td className="px-4 py-2.5"><MetricButton m={d} signed testId={`button-table-diff-${r.key}`} /></td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>

      <section className="rise grid gap-3 text-xs leading-relaxed text-muted-foreground md:grid-cols-[1fr_1fr]" style={{ animationDelay: '320ms' }}>
        <div className="flex gap-2 rounded-md border border-dashed p-3">
          <Info className="mt-0.5 size-4 shrink-0 text-primary" aria-hidden />
          <p>
            معدل الخردة = كمية الخردة ÷ مدخلات المادة × 100. المردود = الإنتاج الجيد ÷ المدخل × 100. فروق المعدلات بالنقاط المئوية. لا تُحسب الفعالية الكلية للمعدات (OEE) لعدم توفر بياناتها.
          </p>
        </div>
        <div className="flex gap-2 rounded-md border border-dashed p-3">
          <Info className="mt-0.5 size-4 shrink-0 text-e2" aria-hidden />
          <p>
            أداة قراءة فقط: لا اتصال بنظام ERP ولا إرسال بيانات إليه. ملفات CSV تُعالج في ذاكرة المتصفح فقط دون رفع أو حفظ دائم، وتُفقد عند تحديث الصفحة. القيمة المفقودة تظهر «غير معروف» ولا تُعامل كصفر.
          </p>
        </div>
      </section>
    </div>
  );
}
