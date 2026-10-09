import { AlertTriangle } from 'lucide-react';
import { LINES, type Dataset } from '@/lib/data';
import { useStore } from '@/lib/store';

export function DataIssues({ dataset }: { dataset: Dataset }) {
  const { openTrace } = useStore();
  if (dataset.origin !== 'csv') return null;
  const affected = dataset.records.filter((record) => record.warnings.length > 0);
  const missing = LINES.filter((line) => !dataset.records.some((record) => record.line === line && record.kind === 'production'));
  if (!affected.length && !missing.length) return null;
  return (
    <div role="alert" className="rounded-md border border-destructive/40 bg-destructive/5 p-4 text-sm" data-testid={`data-issues-${dataset.id}`}>
      <h3 className="flex items-center gap-2 font-semibold text-destructive"><AlertTriangle className="size-4 shrink-0" aria-hidden />خطأ في البيانات — توجد مشكلات تحتاج إلى مراجعة</h3>
      {affected.length > 0 && <p className="mt-2">عدد الصفوف التي تحتوي على مشكلات: {affected.length}. لم تُحذف الصفوف الناقصة أو المكررة ولم تُدمج؛ افتح الصف الأصلي لمراجعة التفاصيل.</p>}
      {missing.map((line) => <p key={line} className="mt-2 text-destructive">سجل إنتاج غير متوفر للتشغيل {line} في البيانات المستوردة؛ لا يمكن عرض أرقامه دون سجل مصدر.</p>)}
      {affected.length > 0 && (
        <details className="mt-3">
          <summary className="cursor-pointer font-medium text-destructive">عرض مشكلات البيانات والصفوف الأصلية</summary>
          <ul className="mt-2 max-h-64 space-y-3 overflow-auto">
            {affected.map((record) => (
              <li key={record.id}>
                <button className="text-start font-medium underline underline-offset-4" onClick={() => openTrace({ recordId: record.id })}>
                  {record.fileName} — الصف الأصلي {record.physicalRow}
                </button>
                <ul className="mt-1 list-disc ps-5 text-xs leading-6">{record.warnings.map((warning, i) => <li key={i}>{warning}</li>)}</ul>
              </li>
            ))}
          </ul>
        </details>
      )}
    </div>
  );
}
