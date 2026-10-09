import { FileSpreadsheet, MessageSquareText } from 'lucide-react';
import { cn } from '@/lib/utils';
import { fmtNum, fmtSigned, UNIT_LABEL, type Metric, type Origin } from '@/lib/data';
import { useStore } from '@/lib/store';

export function OriginBadge({ origin, className }: { origin: Origin; className?: string }) {
  const user = origin === 'user';
  const Icon = user ? MessageSquareText : FileSpreadsheet;
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 rounded-sm border px-1.5 py-0.5 text-[11px] font-medium whitespace-nowrap',
        user ? 'border-[hsl(var(--e2)/.35)] bg-[hsl(var(--e2)/.08)] text-e2' : 'border-[hsl(var(--e1)/.35)] bg-[hsl(var(--e1)/.08)] text-e1',
        className,
      )}
    >
      <Icon className="size-3" aria-hidden />
      {user ? 'رسالة المستخدم' : 'ملف CSV مستورد'}
    </span>
  );
}

export function Unknown({ className }: { className?: string }) {
  return (
    <span className={cn('hatch inline-flex items-center rounded-sm border border-dashed px-1.5 py-0.5 text-xs font-medium text-muted-foreground', className)}>
      غير معروف
    </span>
  );
}

export function ValueText({ m, signed, size = 'md' }: { m: Metric; signed?: boolean; size?: 'md' | 'lg' | 'xl' }) {
  if (m.value === null) return <Unknown />;
  const n = signed ? fmtSigned(m.value) : fmtNum(m.value);
  const pct = m.unit === '%';
  return (
    <span className="inline-flex items-baseline gap-1">
      <span className={cn('num font-medium', size === 'lg' && 'text-xl', size === 'xl' && 'text-4xl font-semibold tracking-tight')}>
        {n}
        {pct ? '%' : ''}
      </span>
      {!pct && <span className="text-[11px] text-muted-foreground">{UNIT_LABEL[m.unit]}</span>}
    </span>
  );
}

/** Every number is a button that opens its source trace. */
export function MetricButton({
  m,
  signed,
  size,
  className,
  testId,
}: {
  m: Metric;
  signed?: boolean;
  size?: 'md' | 'lg' | 'xl';
  className?: string;
  testId?: string;
}) {
  const { openTrace } = useStore();
  return (
    <button
      type="button"
      data-testid={testId ?? `button-metric-${m.id}`}
      onClick={() => openTrace({ metric: m })}
      aria-label={`عرض مصدر ${m.label}`}
      className={cn(
        'group relative inline-flex items-center gap-1.5 rounded-sm px-1.5 py-0.5 -mx-1.5 text-start transition-colors',
        'hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
        className,
      )}
    >
      <ValueText m={m} signed={signed} size={size} />
      <span
        aria-hidden
        className={cn(
          'size-1.5 shrink-0 rounded-full transition-transform group-hover:scale-150',
          m.kind === 'derived' ? 'border border-primary' : 'bg-primary/60',
        )}
      />
    </button>
  );
}
