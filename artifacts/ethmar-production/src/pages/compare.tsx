import { useMemo } from 'react';
import { Info } from 'lucide-react';
import { computeLine, diffMetric, LINES, METRIC_ROWS, type LineId, type LineMetrics } from '@/lib/data';
import { useStore } from '@/lib/store';
import { MetricButton } from '@/components/bits';
import { cn } from '@/lib/utils';

function LinePanel({ line, m, delay }: { line: LineId; m: LineMetrics; delay: number }) {
  const e1 = line === 'E-01';
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
        <span className="text-xs text-muted-foreground">خط بثق</span>
      </div>
      <div className="grid grid-cols-2 gap-px bg-border">
        <div className="bg-card px-5 py-4">
          <div className="text-xs text-muted-foreground">نسبة المردود</div>
          <MetricButton m={m.yield} size="xl" />
        </div>
        <div className="bg-card px-5 py-4">
          <div className="text-xs text-muted-foreground">نسبة الهالك</div>
          <MetricButton m={m.scrapRate} size="xl" />
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
  const { active, byId } = useStore();
  const lm = useMemo(() => {
    const r = {} as Record<LineId, LineMetrics>;
    LINES.forEach((l) => (r[l] = computeLine(active, l, byId)));
    return r;
  }, [active, byId]);

  const yd = diffMetric(lm['E-01'].yield, lm['E-02'].yield, 'yield', 'نسبة المردود');

  return (
    <div className="space-y-6">
      <div className="rise flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">مقارنة تشغيلين: E-01 مقابل E-02</h1>
          <p className="mt-1 text-sm text-muted-foreground">انقر أي رقم لعرض السجل والحقل والوحدة التي جاء منها، أو الصيغة التي اشتُق بها.</p>
        </div>
        <div className="rounded-md border bg-card px-4 py-2 text-sm">
          <div className="text-[11px] text-muted-foreground">فرق المردود (E-01 − E-02)</div>
          <MetricButton m={yd} signed size="lg" testId="button-headline-yield-diff" />
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        {LINES.map((l, i) => (
          <LinePanel key={l} line={l} m={lm[l]} delay={80 + i * 80} />
        ))}
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
                <th scope="col" className="px-4 py-2 text-start font-medium">الفرق (E-01 − E-02)</th>
              </tr>
            </thead>
            <tbody>
              {METRIC_ROWS.map((r) => {
                const a = lm['E-01'][r.key];
                const b = lm['E-02'][r.key];
                const d = diffMetric(a, b, r.key, r.label);
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
            المردود = الإنتاج الجيد ÷ المدخل × 100. الهالك ٪ = الهالك ÷ المدخل × 100. فرق المردود بالنقاط المئوية. لا تُحسب الفعالية الكلية للمعدات (OEE) لعدم توفر بيانات زمن التشغيل المخطط ومعدل الأداء.
          </p>
        </div>
        <div className="flex gap-2 rounded-md border border-dashed p-3">
          <Info className="mt-0.5 size-4 shrink-0 text-e2" aria-hidden />
          <p>
            التوقف غير المخطط يُعرض منفصلاً عن تغيير القالب ولا يُجمع معه. القيمة المفقودة تظهر «غير معروف» ولا تُعامل كصفر. الفروق حسابية فقط ولا تحدد أسباباً.
          </p>
        </div>
      </section>
    </div>
  );
}
