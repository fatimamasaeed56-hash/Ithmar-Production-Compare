import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { FIELD_META, FIELDS, fmtNum, UNIT_LABEL, type FieldKey, type SourceRecord } from '@/lib/data';
import { useStore } from '@/lib/store';
import { OriginBadge, Unknown, ValueText } from './bits';
import { cn } from '@/lib/utils';
import { Sigma, FileText } from 'lucide-react';

function RecordCard({ rec, highlight }: { rec: SourceRecord; highlight?: FieldKey[] }) {
  const ds = useStore().datasets.find((d) => d.id === rec.datasetId);
  const fields = FIELDS.filter((f) => rec.values[f] !== undefined || highlight?.includes(f));
  return (
    <div className="rounded-md border bg-card" data-testid={`card-record-${rec.id}`}>
      <div className="flex flex-wrap items-center gap-2 border-b px-3 py-2">
        <OriginBadge origin={rec.origin} />
        <span className="text-sm font-semibold">{rec.label}</span>
        <span className="text-xs text-muted-foreground">{ds?.title}</span>
      </div>
      <dl className="grid grid-cols-2 gap-x-4 gap-y-1.5 px-3 py-2 text-xs sm:grid-cols-4">
        <div>
          <dt className="text-muted-foreground">الخط</dt>
          <dd className="num font-medium text-start">{rec.line}</dd>
        </div>
        <div>
          <dt className="text-muted-foreground">نوع السجل</dt>
          <dd className="font-medium">{rec.kind === 'production' ? 'تشغيل إنتاج' : rec.kind === 'downtime' ? 'حدث توقف' : 'غير معروف'}</dd>
        </div>
        <div>
          <dt className="text-muted-foreground">اسم الملف</dt>
          <dd className="font-medium break-all">{rec.fileName ?? 'لا يوجد — نص رسالة'}</dd>
        </div>
        <div>
          <dt className="text-muted-foreground">رقم الصف الأصلي في CSV</dt>
          <dd className="font-medium" data-testid={`source-row-${rec.id}`}>
            {rec.physicalRow === null ? (
              'لا ينطبق'
            ) : (
              <span className="num">
                {rec.physicalRow}
                {rec.physicalRowEnd != null && rec.physicalRowEnd !== rec.physicalRow ? `–${rec.physicalRowEnd}` : ''}
              </span>
            )}
          </dd>
        </div>
      </dl>
      {rec.origin === 'csv' && <p className="px-3 pb-2 text-[11px] text-muted-foreground">رقم السطر الفعلي في الملف الأصلي، شاملًا رأس الأعمدة والأسطر الفارغة؛ قد يمتد السجل لعدة أسطر.</p>}
      <div className="px-3 pb-2">
        <div className="mb-1 flex items-center gap-1 text-[11px] text-muted-foreground">
          <FileText className="size-3" aria-hidden /> النص الخام للسجل
        </div>
        <pre dir="ltr" className="num max-h-28 overflow-auto whitespace-pre-wrap break-all rounded-sm bg-muted px-2 py-1.5 text-[12px] text-start" data-testid={`text-raw-${rec.id}`}>
          {rec.rawText}
        </pre>
      </div>
      <div className="overflow-x-auto px-3 pb-3">
        <table className="w-full text-xs">
          <thead>
            <tr className="text-muted-foreground">
              <th className="py-1 text-start font-normal">الحقل</th>
              <th className="py-1 text-start font-normal">العمود الأصلي</th>
              <th className="py-1 text-start font-normal">الخلية الخام</th>
              <th className="py-1 text-start font-normal">القيمة</th>
              <th className="py-1 text-start font-normal">الوحدة</th>
            </tr>
          </thead>
          <tbody>
            {fields.map((f) => {
              const c = rec.values[f];
              const hl = highlight?.includes(f);
              return (
                <tr key={f} className={cn('border-t', hl && 'bg-[hsl(var(--e1)/.07)]')}>
                  <td className={cn('py-1.5', hl && 'font-semibold')}>
                    {hl && <span className="ms-0 me-1 inline-block size-1.5 rounded-full bg-primary align-middle" aria-hidden />}
                    {FIELD_META[f].label}
                  </td>
                  <td className="num py-1.5 text-start">{c?.column ?? (rec.origin === 'user' ? '—' : 'غير مُعيَّن')}</td>
                  <td className="num py-1.5 text-start">{c?.raw ? `"${c.raw}"` : <span className="text-muted-foreground">(فارغ)</span>}</td>
                  <td className="py-1.5">{c?.value != null ? <span className="num">{fmtNum(c.value)}</span> : <Unknown />}</td>
                  <td className="py-1.5">{UNIT_LABEL[FIELD_META[f].unit]}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
        {rec.rawFields && (
          <details className="mt-3 rounded border p-2 text-xs" open>
            <summary className="cursor-pointer font-medium">جميع الأعمدة والقيم الخام كما وردت</summary>
            <dl className="mt-2 grid grid-cols-2 gap-2" dir="ltr">
              {Object.entries(rec.rawFields).map(([key, value]) => (
                <div key={key} className="min-w-0">
                  <dt className="break-all font-medium">{key}</dt>
                  <dd className="whitespace-pre-wrap break-all">{value || '(فارغ)'}</dd>
                </div>
              ))}
            </dl>
          </details>
        )}
        {rec.warnings.length > 0 && (
          <ul className="mt-2 space-y-1 text-[11px] text-e2">
            {rec.warnings.map((w) => (
              <li key={w}>— {w}</li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

export function SourceDetailDialog() {
  const { trace, closeTrace, byId } = useStore();
  const metric = trace && 'metric' in trace ? trace.metric : null;
  const rec = trace && 'recordId' in trace ? byId.get(trace.recordId) : null;

  const groups = new Map<string, FieldKey[]>();
  metric?.deps.forEach((d) => groups.set(d.recordId, [...(groups.get(d.recordId) ?? []), d.field]));

  return (
    <Dialog open={!!trace} onOpenChange={(o) => !o && closeTrace()}>
      <DialogContent dir="rtl" className="max-h-[90dvh] max-w-2xl overflow-y-auto p-0 sm:rounded-md" data-testid="dialog-source-detail">
        <DialogHeader className="sticky top-0 z-10 border-b bg-background/95 px-5 pt-5 pb-3 text-start backdrop-blur sm:text-start">
          <DialogTitle className="text-base">{metric ? metric.label : rec?.label ?? 'سجل'}</DialogTitle>
          <DialogDescription className="text-xs">
            {metric
              ? metric.kind === 'derived'
                ? 'قيمة مشتقة — الصيغة والسجلات التي تعتمد عليها'
                : 'قيمة مأخوذة مباشرة من سجل مصدر'
              : 'تفاصيل السجل المصدر كما ورد'}
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 px-5 pb-5">
          {metric && (
            <div className="paper-grid rounded-md border p-4">
              <div className="flex flex-wrap items-end justify-between gap-3">
                <ValueText m={metric} signed={metric.id.startsWith('diff')} size="xl" />
                <span className="rounded-sm border bg-background px-2 py-0.5 text-[11px]">
                  {metric.kind === 'derived' ? 'مشتقة' : 'خام'} · {UNIT_LABEL[metric.unit]}
                </span>
              </div>
              {metric.formula && (
                <div className="mt-3 space-y-1 rounded-sm bg-background/90 p-2.5 text-sm">
                  <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                    <Sigma className="size-3.5" aria-hidden /> الصيغة
                  </div>
                  <div className="font-medium">{metric.formula}</div>
                  {metric.substitution && (
                    <div dir="ltr" className="num text-start text-[13px] text-primary" data-testid="text-substitution">
                      {metric.substitution}
                    </div>
                  )}
                </div>
              )}
              {metric.note && <p className="mt-2 text-xs text-muted-foreground">{metric.note}</p>}
            </div>
          )}
          {metric && (
            <h3 className="text-xs font-semibold text-muted-foreground">
              {groups.size === 0 ? 'لا توجد سجلات مصدر' : `السجلات المصدر (${groups.size})`}
            </h3>
          )}
          {[...groups.entries()].map(([id, fs]) => {
            const r = byId.get(id);
            return r ? <RecordCard key={id} rec={r} highlight={fs} /> : null;
          })}
          {rec && <RecordCard rec={rec} />}
          <p className="border-t pt-3 text-[11px] leading-relaxed text-muted-foreground">
            العرض للقراءة فقط. مصدر «رسالة المستخدم» هو نص كتبه المستخدم وليس ملفاً معتمداً. ملفات CSV تُعالج محلياً داخل المتصفح ولا تُرفع إلى أي خادم، ولا يعني استيرادها أنها راجعتها أو اعتمدتها جهة مستقلة.
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
}
