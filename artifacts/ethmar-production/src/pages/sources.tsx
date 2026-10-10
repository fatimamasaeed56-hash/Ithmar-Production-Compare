import { Eye, FileUp } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { FIELD_META, FIELDS, LINES, type Dataset } from '@/lib/data';
import { useStore } from '@/lib/store';
import { OriginBadge, MetricButton } from '@/components/bits';
import { cn } from '@/lib/utils';
import { DataIssues } from '@/components/data-issues';
import { Textarea } from '@/components/ui/textarea';

function DatasetBlock({ ds }: { ds: Dataset }) {
  const { active, setActiveId, openTrace, selectRecord, toggleDowntime, notes, setNote } = useStore();
  const isActive = active.id === ds.id;
  const status = (id: string) => {
    if (Object.values(ds.selection).includes(id)) return { t: 'تشغيل مختار', c: 'bg-primary text-primary-foreground' };
    if (Object.values(ds.downtime).some((a) => a.includes(id))) return { t: 'توقف مرتبط', c: 'bg-accent text-accent-foreground' };
    return { t: 'غير مستخدم', c: 'bg-muted text-muted-foreground' };
  };
  return (
    <section className={cn('rise overflow-hidden rounded-md border bg-card', isActive && 'ring-1 ring-primary')} data-testid={`section-dataset-${ds.id}`}>
      <div className="flex flex-wrap items-center gap-2 border-b px-4 py-3">
        <OriginBadge origin={ds.origin} />
        <h2 className="text-sm font-semibold break-all">{ds.title}</h2>
        {isActive ? (
          <span className="ms-auto text-xs text-primary">المصدر النشط</span>
        ) : (
          <Button size="sm" variant="outline" className="ms-auto h-7" onClick={() => setActiveId(ds.id)} data-testid={`button-activate-${ds.id}`}>
            <Eye className="size-3.5" /> عرض في المقارنة
          </Button>
        )}
      </div>
      <DataIssues dataset={ds} />
      {ds.files.length > 0 && (
        <ul className="flex flex-wrap gap-x-4 gap-y-1 border-b bg-muted/30 px-4 py-2 text-[11px] text-muted-foreground">
          {ds.files.map((f) => (
            <li key={f.name}>
              {f.name} · فاصل <span className="num">{f.delimiter}</span> · <span className="num">{f.dataRows}</span> صف · {f.hadBom ? 'BOM' : 'بدون BOM'}
            </li>
          ))}
        </ul>
      )}
      {ds.origin === 'csv' && (
        <div className="grid gap-3 border-b p-4 md:grid-cols-2">
          {LINES.map((line) => (
            <div key={line} className="space-y-2 text-xs">
              <label className="block">
                تشغيل المقارنة {line} — اختر صفًا واحدًا دون جمع السجلات
                <select className="mt-1 block w-full rounded border bg-card p-2" value={ds.selection[line]}
                  onChange={(e) => selectRecord(ds.id, line, e.target.value)}>
                  <option value="">غير محدد / غير متوفر</option>
                  {ds.records.filter((r) => r.line === line && r.kind === 'production').map((r) => (
                    <option key={r.id} value={r.id}>{r.fileName} — صف {r.physicalRow} — {r.metadata?.event_id || 'معرّف الحدث ناقص'}</option>
                  ))}
                </select>
              </label>
              <p>أحداث التوقف منفصلة؛ اربط فقط ما يخص التشغيل المختار:</p>
              {ds.records.filter((r) => r.line === line && (r.kind === 'downtime' || r.id === ds.selection[line]) && r.values.downtime?.value != null).map((r) => (
                <label key={r.id} className="flex items-center gap-2">
                  <input type="checkbox" disabled={!ds.selection[line]} checked={ds.downtime[line].includes(r.id)}
                    onChange={() => toggleDowntime(ds.id, line, r.id)} />
                  {r.fileName} — صف {r.physicalRow} — {r.values.downtime?.value} دقيقة
                </label>
              ))}
            </div>
          ))}
        </div>
      )}
      <div className="overflow-x-auto">
        <table className="w-full min-w-[760px] text-xs">
          <thead>
            <tr className="border-b text-muted-foreground">
              <th className="px-3 py-2 text-start font-medium">الحالة</th>
              <th className="px-3 py-2 text-start font-medium">الخط</th>
              <th className="px-3 py-2 text-start font-medium">النوع</th>
              <th className="px-3 py-2 text-start font-medium">الملف / رقم الصف الأصلي</th>
              {FIELDS.map((f) => (
                <th key={f} className="px-3 py-2 text-start font-medium">{FIELD_META[f].label}</th>
              ))}
              <th className="px-3 py-2 text-start font-medium">التتبّع</th>
            </tr>
          </thead>
          <tbody>
            {ds.records.map((r) => {
              const s = status(r.id);
              return (
                <tr key={r.id} className="border-b last:border-0 hover:bg-muted/30" data-testid={`row-record-${r.id}`}>
                  <td className="px-3 py-2"><span className={cn('rounded-sm px-1.5 py-0.5 text-[10px] whitespace-nowrap', s.c)}>{s.t}</span>
                    {r.warnings.length > 0 && <details className="mt-1 min-w-36 text-destructive"><summary className="cursor-pointer">خطأ: مشكلات في البيانات ({r.warnings.length})</summary><ul>{r.warnings.map((w, i) => <li key={i}>{w}</li>)}</ul></details>}
                  </td>
                  <td className={cn('num px-3 py-2 text-start font-semibold', r.line === 'E-01' ? 'text-e1' : 'text-e2')}>{r.line}</td>
                  <td className="px-3 py-2 whitespace-nowrap">{r.kind === 'production' ? 'تشغيل' : r.kind === 'downtime' ? 'حدث توقف' : 'غير معروف'}</td>
                  <td className="px-3 py-2">
                    {r.fileName ? (
                      <span className="break-all">{r.fileName} · <span className="num">{r.physicalRow}</span></span>
                    ) : (
                      <span className="text-muted-foreground">رسالة</span>
                    )}
                  </td>
                  {FIELDS.map((f) => {
                    const c = r.values[f];
                    return (
                      <td key={f} className="px-3 py-2">
                        {c === undefined ? <span className="text-muted-foreground">—</span> : (
                          <MetricButton
                            testId={`button-source-${r.id}-${f}`}
                            m={{
                              id: `${r.id}-${f}`,
                              label: `${FIELD_META[f].label} — ${r.line}`,
                              value: c.value,
                              unit: FIELD_META[f].unit,
                              kind: 'raw',
                              deps: [{ recordId: r.id, field: f }],
                            }}
                          />
                        )}
                      </td>
                    );
                  })}
                  <td className="px-3 py-2">
                    <Button size="sm" variant="ghost" className="h-7" onClick={() => openTrace({ recordId: r.id })} data-testid={`button-record-detail-${r.id}`} aria-label={`تتبّع القيم الخام — ${r.label}`}>
                      التتبّع
                    </Button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      {ds.origin === 'csv' && (
        <div className="border-t bg-muted/20 px-4 py-3">
          <label htmlFor={`notes-${ds.id}`} className="mb-2 block text-sm font-medium">ملاحظات</label>
          <Textarea
            id={`notes-${ds.id}`}
            data-testid={`notes-${ds.id}`}
            aria-describedby={`notes-help-${ds.id}`}
            rows={2}
            dir="auto"
            value={notes[ds.id] ?? ''}
            onChange={(event) => setNote(ds.id, event.target.value)}
            placeholder="اكتب ملاحظاتك هنا…"
            className="min-h-20 resize-y bg-background text-start"
          />
          <p id={`notes-help-${ds.id}`} className="mt-1.5 text-[11px] text-muted-foreground">
            ملاحظات مؤقتة لهذا الجدول؛ لا تغيّر بيانات المصدر ولا تُرسل أو تُحفظ، وتزول عند تحديث الصفحة أو تسجيل الخروج.
          </p>
        </div>
      )}
    </section>
  );
}

export default function SourcesPage() {
  const { datasets, setImportOpen } = useStore();
  return (
    <div className="space-y-5">
      <div className="rise flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">سجلات المصدر</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            كل السجلات كما وردت، للقراءة فقط. «—» حقل غير موجود في السجل، و«غير معروف» خلية فارغة.
          </p>
        </div>
      </div>
      <div className="flex justify-end">
        <Button variant="default" onClick={() => setImportOpen(true)} data-testid="button-sources-import"><FileUp className="size-4" /> استيراد CSV</Button>
      </div>
      {datasets.map((d) => (
        <DatasetBlock key={d.id} ds={d} />
      ))}
    </div>
  );
}
