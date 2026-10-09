import { Eye } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { FIELD_META, FIELDS, fmtNum, type Dataset } from '@/lib/data';
import { useStore } from '@/lib/store';
import { OriginBadge, Unknown } from '@/components/bits';
import { cn } from '@/lib/utils';

function DatasetBlock({ ds }: { ds: Dataset }) {
  const { active, setActiveId, openTrace } = useStore();
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
      {ds.files.length > 0 && (
        <ul className="flex flex-wrap gap-x-4 gap-y-1 border-b bg-muted/30 px-4 py-2 text-[11px] text-muted-foreground">
          {ds.files.map((f) => (
            <li key={f.name}>
              {f.name} · فاصل <span className="num">{f.delimiter}</span> · <span className="num">{f.dataRows}</span> صف · {f.hadBom ? 'BOM' : 'بدون BOM'}
            </li>
          ))}
        </ul>
      )}
      <div className="overflow-x-auto">
        <table className="w-full min-w-[760px] text-xs">
          <thead>
            <tr className="border-b text-muted-foreground">
              <th className="px-3 py-2 text-start font-medium">الحالة</th>
              <th className="px-3 py-2 text-start font-medium">الخط</th>
              <th className="px-3 py-2 text-start font-medium">النوع</th>
              <th className="px-3 py-2 text-start font-medium">الملف / الصف</th>
              {FIELDS.map((f) => (
                <th key={f} className="px-3 py-2 text-start font-medium">{FIELD_META[f].label}</th>
              ))}
              <th className="px-3 py-2"><span className="sr-only">تفاصيل</span></th>
            </tr>
          </thead>
          <tbody>
            {ds.records.map((r) => {
              const s = status(r.id);
              return (
                <tr key={r.id} className="border-b last:border-0 hover:bg-muted/30" data-testid={`row-record-${r.id}`}>
                  <td className="px-3 py-2"><span className={cn('rounded-sm px-1.5 py-0.5 text-[10px] whitespace-nowrap', s.c)}>{s.t}</span></td>
                  <td className={cn('num px-3 py-2 text-start font-semibold', r.line === 'E-01' ? 'text-e1' : 'text-e2')}>{r.line}</td>
                  <td className="px-3 py-2 whitespace-nowrap">{r.kind === 'production' ? 'تشغيل' : 'حدث توقف'}</td>
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
                        {c === undefined ? <span className="text-muted-foreground">—</span> : c.value === null ? <Unknown /> : <span className="num">{fmtNum(c.value)}</span>}
                      </td>
                    );
                  })}
                  <td className="px-3 py-2">
                    <Button size="sm" variant="ghost" className="h-7" onClick={() => openTrace({ recordId: r.id })} data-testid={`button-record-detail-${r.id}`} aria-label={`تفاصيل ${r.label}`}>
                      السجل الخام
                    </Button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
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
        <Button size="sm" onClick={() => setImportOpen(true)} data-testid="button-sources-import">استيراد CSV</Button>
      </div>
      {datasets.map((d) => (
        <DatasetBlock key={d.id} ds={d} />
      ))}
    </div>
  );
}
