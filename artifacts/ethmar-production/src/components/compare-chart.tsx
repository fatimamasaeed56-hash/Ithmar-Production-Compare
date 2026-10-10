import { useState } from 'react';
import { Line, LineChart, CartesianGrid, LabelList, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { diffMetric, fmtNum, LINES, UNIT_LABEL, type LineId, type LineMetrics } from '@/lib/data';
import { MetricButton } from '@/components/bits';
import { cn } from '@/lib/utils';

type ChartKey = 'scrapRate' | 'yield' | 'input' | 'good' | 'scrap' | 'mold' | 'downtime';
const OPTIONS: { key: ChartKey; label: string }[] = [
  { key: 'scrapRate', label: 'معدل الخردة' },
  { key: 'yield', label: 'نسبة المردود' },
  { key: 'input', label: 'المدخل' },
  { key: 'good', label: 'الإنتاج الجيد' },
  { key: 'scrap', label: 'الهالك' },
  { key: 'mold', label: 'تغيير القالب' },
  { key: 'downtime', label: 'التوقف غير المخطط' },
];

const COLOR: Record<LineId, string> = { 'E-01': 'hsl(var(--e1))', 'E-02': 'hsl(var(--e2))' };

function RunDot(props: unknown) {
  const p = props as { cx?: number; cy?: number; payload?: { value: number | null; line: LineId } };
  if (p.payload?.value == null || p.cx === undefined || p.cy === undefined) return <g />;
  return <circle cx={p.cx} cy={p.cy} r={5} fill={COLOR[p.payload.line]} stroke="hsl(var(--card))" strokeWidth={2} />;
}

export function CompareChart({ lm }: { lm: Record<LineId, LineMetrics> }) {
  const [key, setKey] = useState<ChartKey>('scrapRate');
  const opt = OPTIONS.find((o) => o.key === key)!;
  const unit = lm['E-01'][key].unit;
  const unitText = unit === '%' ? '%' : UNIT_LABEL[unit];
  const fmt = (v: number | null) => (v === null ? 'غير معروف' : unit === '%' ? `${fmtNum(v)}%` : `${fmtNum(v)} ${unitText}`);
  const data = LINES.map((l) => ({ line: l, value: lm[l][key].value }));
  const known = data.filter((d) => d.value !== null);
  const max = Math.max(0, ...known.map((d) => d.value as number));
  const min = Math.min(0, ...known.map((d) => d.value as number));
  const allZero = known.length > 0 && known.every((d) => d.value === 0);
  const diff = diffMetric(lm['E-02'][key], lm['E-01'][key], `chart-${key}`, opt.label);
  const over100 = unit === '%' && known.some((d) => (d.value as number) > 100 || (d.value as number) < 0);

  return (
    <section className="rise rounded-md border bg-card" style={{ animationDelay: '200ms' }} aria-labelledby="cmp-chart" data-testid="section-compare-chart">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b px-4 py-3">
        <h2 id="cmp-chart" className="text-sm font-semibold">
          مخطط المقارنة — {opt.label} <span className="num text-xs text-muted-foreground">({unitText})</span>
        </h2>
        <div role="group" aria-label="اختيار المقياس" className="flex flex-wrap gap-1">
          {OPTIONS.map((o) => (
            <button
              key={o.key}
              type="button"
              aria-pressed={o.key === key}
              onClick={() => setKey(o.key)}
              data-testid={`button-chart-metric-${o.key}`}
              className={cn(
                'rounded-sm border px-2 py-1 text-xs transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
                o.key === key ? 'border-primary bg-primary text-primary-foreground' : 'hover:bg-accent',
              )}
            >
              {o.label}
            </button>
          ))}
        </div>
      </div>
      <div className="grid gap-4 p-4 md:grid-cols-[1fr_220px]">
        <div className="relative h-56" dir="ltr">
          {known.length === 0 ? (
            <div className="hatch flex h-full items-center justify-center rounded-sm border border-dashed text-sm text-muted-foreground" dir="rtl">
              لا توجد قيم معروفة لهذا المقياس — غير معروف للخطين.
            </div>
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={data} margin={{ top: 24, right: 32, left: 8, bottom: 8 }}>
                <CartesianGrid vertical={false} stroke="hsl(var(--border))" strokeDasharray="3 3" />
                <XAxis type="category" dataKey="line" padding={{ left: 24, right: 24 }} tick={{ fontFamily: 'var(--app-font-mono)', fontSize: 12, fill: 'hsl(var(--foreground))' }} axisLine={false} tickLine={false} />
                <YAxis
                  type="number"
                  width={48}
                  domain={[min, allZero ? 1 : max * 1.15 || 1]}
                  allowDataOverflow={false}
                  tickFormatter={(v: number) => fmtNum(v)}
                  tick={{ fontFamily: 'var(--app-font-mono)', fontSize: 11, fill: 'hsl(var(--muted-foreground))' }}
                  axisLine={false}
                  tickLine={false}
                  label={{ value: unitText, angle: -90, position: 'insideLeft', fontSize: 11, fill: 'hsl(var(--muted-foreground))' }}
                />
                <Tooltip
                  cursor={{ stroke: 'hsl(var(--border))', strokeDasharray: '3 3' }}
                  formatter={(v: unknown) => [fmt(typeof v === 'number' ? v : null), opt.label]}
                  contentStyle={{ borderRadius: 4, border: '1px solid hsl(var(--border))', fontSize: 12, direction: 'rtl' }}
                />
                <Line
                  key={key}
                  dataKey="value"
                  type="linear"
                  stroke="hsl(var(--primary))"
                  strokeWidth={3}
                  connectNulls={false}
                  dot={RunDot}
                  activeDot={{ r: 6 }}
                  isAnimationActive={false}
                >
                  <LabelList dataKey="value" position="top" formatter={(v: unknown) => fmt(typeof v === 'number' ? v : null)} style={{ fontFamily: 'var(--app-font-mono)', fontSize: 11, fill: 'hsl(var(--foreground))' }} />
                </Line>
              </LineChart>
            </ResponsiveContainer>
          )}
        </div>
        <div className="space-y-3 text-sm">
          {LINES.map((l) => (
            <div key={l} className="flex items-center justify-between gap-2 border-b pb-2">
              <span className="flex items-center gap-2">
                <span className={cn('size-2.5 rounded-sm', l === 'E-01' ? 'bg-e1' : 'bg-e2')} aria-hidden />
                <span className={cn('num font-semibold', l === 'E-01' ? 'text-e1' : 'text-e2')}>{l}</span>
              </span>
              <MetricButton m={lm[l][key]} testId={`button-chart-${l}-${key}`} />
            </div>
          ))}
          <div>
            <div className="text-[11px] text-muted-foreground">الفرق (E-02 − E-01){unit === '%' ? ' بالنقاط المئوية' : ''}</div>
            <MetricButton m={diff} signed testId={`button-chart-diff-${key}`} />
          </div>
          {allZero && <p className="text-xs text-muted-foreground">القيم المعروفة تساوي صفرًا فعليًا؛ القيم المفقودة ليست صفرًا.</p>}
          {known.length === 1 && <p className="text-xs text-muted-foreground">تظهر نقطة واحدة فقط؛ لا يُرسم خط مقارنة مع قيمة غير معروفة.</p>}
          {over100 && <p className="text-xs text-destructive">تنبيه: نسبة خارج 0–100٪ — بيانات غير متسقة، تُعرض كما هي دون قص.</p>}
          {key === 'downtime' && <p className="text-[11px] text-muted-foreground">التوقف منفصل عن تغيير القالب ولا يُجمع معه.</p>}
        </div>
      </div>
    </section>
  );
}
