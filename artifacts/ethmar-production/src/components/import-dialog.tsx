import { useEffect, useMemo, useRef, useState } from 'react';
import { AlertTriangle, CheckCircle2, Download, FileUp, Lock, Trash2, X } from 'lucide-react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { parseCsv, type CsvRow } from '@/lib/csv';
import { FIELD_META, FIELDS, fmtNum, LINES, PROD_FIELDS, type Cell, type FieldKey, type LineId, type SourceRecord } from '@/lib/data';
import { useStore } from '@/lib/store';
import { cn } from '@/lib/utils';
import { useLocation } from 'wouter';

type MetaKey = 'event_id' | 'record_type' | 'order_id' | 'machine' | 'mold_id' | 'shift';
type MapKey = 'line' | FieldKey | MetaKey;
const META_KEYS: MetaKey[] = ['event_id', 'record_type', 'order_id', 'machine', 'mold_id', 'shift'];
const MAP_KEYS: MapKey[] = ['line', ...META_KEYS, ...FIELDS];
const CANONICAL: Record<MapKey, string> = {
  line: 'run_id', event_id: 'event_id', record_type: 'record_type',
  input: 'input_kg', good: 'good_output_kg', scrap: 'scrap_kg',
  mold: 'mold_change_hours', downtime: 'downtime_minutes',
  order_id: 'order_id', machine: 'machine', mold_id: 'mold', shift: 'shift',
};
const MAP_LABEL: Record<MapKey, string> = {
  line: 'run_id — معرّف التشغيل (أساسي)',
  event_id: 'event_id — معرّف الحدث (أساسي)',
  record_type: 'record_type — نوع السجل (أساسي)',
  order_id: 'order_id — الطلب',
  machine: 'machine — الماكينة',
  mold_id: 'mold — القالب',
  shift: 'shift — الوردية',
  input: 'المدخل — كجم',
  good: 'الإنتاج الجيد — كجم',
  scrap: 'الهالك — كجم',
  mold: 'تغيير القالب — ساعات',
  downtime: 'التوقف غير المخطط — دقائق',
};
const GUESS: Record<MapKey, RegExp> = {
  line: /^(run_id|line(_?id)?|خط|الخط|رقم الخط|معرف الخط)/i,
  event_id: /^(event_id|معرف الحدث)$/i,
  record_type: /^(record_type|نوع السجل)$/i,
  order_id: /^(order_id|رقم الطلب)$/i,
  machine: /^(machine|الماكينة)$/i,
  mold_id: /^(mold|القالب)$/i,
  shift: /^(shift|الوردية)$/i,
  input: /(input|feed|مدخل|المدخل|خامة)/i,
  good: /(good|output|جيد|الجيد|انتاج|إنتاج)/i,
  scrap: /(scrap|waste|هالك|الهالك|تالف)/i,
  mold: /(mold_change_hours|mould_change|تغيير القالب)/i,
  downtime: /(downtime|stop|توقف|التوقف)/i,
};

type PFile = {
  id: string;
  name: string;
  size: number;
  text: string;
  delimiter: string;
  hadBom: boolean;
  error: string | null;
  header: CsvRow | null;
  rows: CsvRow[];
  blankLines: number;
  mapping: Record<MapKey, number>;
};

type Candidate = {
  rec: SourceRecord;
  errors: string[];
  fileId: string;
};

const TEMPLATE = 'run_id,event_id,record_type,input_kg,good_output_kg,scrap_kg,mold_change_hours,downtime_minutes,order_id,machine,mold,shift\r\n';

function normDigits(s: string) {
  return s.replace(/[٠-٩]/g, (d) => String('٠١٢٣٤٥٦٧٨٩'.indexOf(d))).replace(/[۰-۹]/g, (d) => String('۰۱۲۳۴۵۶۷۸۹'.indexOf(d)));
}
function normLine(s: string): LineId | null {
  const t = normDigits(s).trim().toUpperCase().replace(/\s+/g, '');
  if (/^E-?0?1$/.test(t)) return 'E-01';
  if (/^E-?0?2$/.test(t)) return 'E-02';
  return null;
}
function guessMapping(headers: string[]): Record<MapKey, number> {
  const m = {} as Record<MapKey, number>;
  const used = new Set<number>();
  MAP_KEYS.forEach((k) => {
    const exact = headers.findIndex((h) => h.trim().toLowerCase() === CANONICAL[k]);
    const idx = exact >= 0 ? exact : headers.findIndex((h, i) => !used.has(i) && GUESS[k].test(h.trim()));
    m[k] = idx;
    if (idx >= 0) used.add(idx);
  });
  return m;
}

function buildCandidates(files: PFile[]): Candidate[] {
  const out: Candidate[] = [];
  const seen = new Map<string, string>();
  files.forEach((f) => {
    if (!f.header) return;
    const headers = f.header.cells;
    f.rows.forEach((row) => {
      const errors: string[] = [];
      const warnings: string[] = [];
      if (f.error) warnings.push(`تنبيه تحليل الملف: ${f.error}`);
      if (row.cells.length !== headers.length)
        errors.push(`عدد الخلايا (${row.cells.length}) لا يطابق عدد الأعمدة في الرأس (${headers.length}).`);
      const lineRaw = f.mapping.line >= 0 ? (row.cells[f.mapping.line] ?? '') : '';
      const line = normLine(lineRaw);
      if (lineRaw.trim() === '') warnings.push('معرّف التشغيل ناقص؛ الصف محفوظ للمراجعة.');
      else if (!line) warnings.push('هذا التشغيل محفوظ للمراجعة لكنه ليس E-01 أو E-02.');
      const metadata = Object.fromEntries(META_KEYS.map((k) => [CANONICAL[k], f.mapping[k] >= 0 ? row.cells[f.mapping[k]] ?? '' : '']));
      for (const k of ['event_id', 'record_type']) {
        if (!metadata[k].trim()) warnings.push(`${k}: قيمة ناقصة — الصف محفوظ للمراجعة.`);
      }
      const values: Partial<Record<FieldKey, Cell>> = {};
      FIELDS.forEach((k) => {
        const ci = f.mapping[k];
        if (ci < 0) return;
        const raw = row.cells[ci] ?? '';
        const t = normDigits(raw).trim();
        let value: number | null = null;
        if (t !== '') {
          if (/^\d+(\.\d+)?$/.test(t) && Number.isFinite(Number(t))) value = Number(t);
          else errors.push(`${FIELD_META[k].label}: القيمة "${raw.trim()}" ليست رقماً غير سالب صالحاً (استخدم النقطة للكسور دون فواصل آلاف).`);
        }
        values[k] = { value, raw, column: headers[ci]?.trim() || `عمود ${ci + 1}` };
      });
      const hasProd = PROD_FIELDS.some((k) => values[k]?.value != null);
      const hasDt = values.downtime?.value != null;
      if (!hasProd && !hasDt) warnings.push('الصف لا يحتوي قيم قياس؛ محفوظ للمراجعة دون تعويضها بأصفار.');
      const recordType = metadata.record_type.trim().toLowerCase();
      const kind: SourceRecord['kind'] = /^(production|run|إنتاج|تشغيل)$/.test(recordType) ? 'production'
        : /^(downtime|unplanned_downtime|stop|توقف)$/.test(recordType) ? 'downtime'
        : !recordType ? (hasProd ? 'production' : hasDt ? 'downtime' : 'unknown') : 'unknown';
      if (kind === 'unknown') warnings.push('نوع السجل غير معروف؛ لم يدخل المقارنة.');
      const sig = `${lineRaw}|${metadata.event_id}|${recordType}|${FIELDS.map((k) => values[k]?.value ?? '∅').join('|')}`;
      const prev = seen.get(sig);
      if (prev && errors.length === 0) warnings.push(`سجل مطابق تماماً لـ ${prev}. لم يُدمج ولم يُحذف — اختر صفاً واحداً فقط.`);
      const where = `${f.name} · صف ${row.startLine}`;
      if (!prev && errors.length === 0) seen.set(sig, where);
      PROD_FIELDS.forEach((k) => {
        if ((kind === 'production' || hasProd) && values[k]?.value == null) warnings.push(`${FIELD_META[k].label}: حقل ناقص أو غير معيّن — غير معروف؛ الصف محفوظ للمراجعة.`);
      });
      if (kind === 'downtime' && values.downtime?.value == null) warnings.push('مدة التوقف ناقصة أو غير معيّنة — الصف محفوظ للمراجعة.');
      out.push({
        fileId: f.id,
        errors,
        rec: {
          id: `${f.id}:r${row.startLine}`,
          datasetId: '',
          origin: 'csv',
          line: line ?? lineRaw.trim(),
          kind,
          metadata,
          rawFields: Object.fromEntries(Array.from({ length: Math.max(headers.length, row.cells.length) }, (_, i) =>
            [`${i + 1}: ${headers[i] ?? 'خلية إضافية بلا عنوان'}`, row.cells[i] ?? ''])),
          values,
          rawText: row.raw,
          physicalRow: row.startLine,
          physicalRowEnd: row.endLine,
          fileName: f.name,
          label: `${line ?? lineRaw.trim()} · ${hasProd ? 'تشغيل' : 'حدث توقف'} · ${f.name} صف ${row.startLine}`,
          warnings,
        },
      });
    });
  });
  return out;
}

export function ImportDialog() {
  const { importOpen, setImportOpen, addDataset } = useStore();
  const [, navigate] = useLocation();
  const mappingRef = useRef<HTMLElement>(null);
  const [mappingTarget, setMappingTarget] = useState<string | null>(null);
  useEffect(() => {
    if (!mappingTarget) return;
    const frame = requestAnimationFrame(() => {
      mappingRef.current?.scrollIntoView({ block: 'start' });
      mappingRef.current?.focus({ preventScroll: true });
    });
    return () => cancelAnimationFrame(frame);
  }, [mappingTarget]);
  const [files, setFiles] = useState<PFile[]>([]);
  const [notices, setNotices] = useState<string[]>([]);
  const [activeFile, setActiveFile] = useState<string | null>(null);
  const [selection, setSelection] = useState<Partial<Record<LineId, string>>>({});
  const [dtAssoc, setDtAssoc] = useState<Record<LineId, string[]>>({ 'E-01': [], 'E-02': [] });
  const inputRef = useRef<HTMLInputElement>(null);
  const seq = useRef(0);

  const reset = () => {
    setMappingTarget(null);
    setFiles([]);
    setNotices([]);
    setActiveFile(null);
    setSelection({});
    setDtAssoc({ 'E-01': [], 'E-02': [] });
  };

  const importFiles = (incoming: PFile[], manual = false) => {
    seq.current += 1;
    const dsId = `csv-${seq.current}`;
    const candidates = buildCandidates(incoming);
    const records = candidates.map(({ rec, errors }) => ({
      ...rec, id: `${dsId}:${rec.id}`, datasetId: dsId,
      warnings: [...rec.warnings, ...errors],
    }));
    const selected = {} as Record<LineId, string>;
    const downtime = {} as Record<LineId, string[]>;
    LINES.forEach((line) => {
      const prods = records.filter((r) => r.line === line && r.kind === 'production');
      const chosen = manual && selection[line] ? `${dsId}:${selection[line]}` : '';
      selected[line] = prods.some((r) => r.id === chosen) ? chosen : prods.length === 1 ? prods[0].id : '';
      // Events require an explicit user association, never an automatic sum.
      downtime[line] = manual ? (dtAssoc[line] ?? []).map((id) => `${dsId}:${id}`) : [];
    });
    addDataset({
      id: dsId, origin: 'csv', title: `استيراد CSV — ${incoming.map((f) => f.name).join('، ')}`,
      files: incoming.map((f) => ({ name: f.name, size: f.size, delimiter: f.delimiter, dataRows: f.rows.length, hadBom: f.hadBom })),
      records, selection: selected, downtime,
    });
    reset();
    setImportOpen(false);
    navigate('/sources');
  };

  const onFiles = async (list: FileList | null) => {
    if (!list) return;
    const chosenFiles = Array.from(list);
    if (inputRef.current) inputRef.current.value = '';
    const next = [...files];
    const n: string[] = [];
    for (const file of chosenFiles) {
      let text: string;
      try { text = await file.text(); }
      catch { n.push(`تعذّرت قراءة ${file.name}؛ يمكنك اختياره مجددًا.`); continue; }
      // Re-selecting replaces only the pending file, not any imported source.
      const previous = next.findIndex((p) => p.name === file.name);
      if (previous >= 0) next.splice(previous, 1);
      const res = parseCsv(text);
      const header = res.rows[0] ?? null;
      seq.current += 1;
      next.push({
        id: `f${seq.current}`,
        name: file.name,
        size: file.size,
        text,
        delimiter: res.delimiter,
        hadBom: res.hadBom,
        error: res.error ?? (header ? null : 'الملف فارغ — لا يوجد صف رأس.'),
        header,
        rows: res.rows.slice(1),
        blankLines: res.blankLines,
        mapping: header ? guessMapping(header.cells) : guessMapping([]),
      });
    }
    setFiles(next);
    setNotices((p) => [...p, ...n]);
    if (!activeFile && next[0]) setActiveFile(next[0].id);
    setSelection({});
    setDtAssoc({ 'E-01': [], 'E-02': [] });
    const needsMapping = next.find((f) => !f.header || ['run_id', 'event_id', 'record_type'].some((name) => !f.header!.cells.includes(name))
      || f.header.cells.some((name) => !Object.values(CANONICAL).includes(name)));
    if (next.length && !n.length && !needsMapping && next.every((f) => !f.error)) {
      importFiles(next);
    } else if (next.length) {
      setActiveFile(needsMapping?.id ?? next[0].id);
      setNotices((p) => [...p, 'راجع ربط الأعمدة والتنبيهات. كل صف بيانات يبقى متاحًا للمراجعة.']);
      setMappingTarget(needsMapping?.id ?? next[0].id);
    }
  };

  const candidates = useMemo(() => buildCandidates(files), [files]);
  const valid = candidates.filter((c) => c.errors.length === 0);
  const invalid = candidates.filter((c) => c.errors.length > 0);
  const fileErrors = files.filter((f) => f.error);
  const prodByLine = (l: LineId) => valid.filter((c) => c.rec.line === l && c.rec.kind === 'production');
  const dtByLine = (l: LineId) =>
    valid.filter((c) => c.rec.line === l && c.rec.values.downtime?.value != null && (c.rec.kind === 'downtime' || c.rec.id === selection[l]));

  const effSel = (l: LineId) => {
    const p = prodByLine(l);
    return selection[l] && p.some((c) => c.rec.id === selection[l]) ? selection[l] : p.length === 1 ? p[0].rec.id : undefined;
  };

  const blockers: string[] = [];
  if (files.length === 0) blockers.push('أضف ملف CSV واحداً على الأقل.');
  files.forEach((f) => {
    if (!f.header) blockers.push(`${f.name}: لا يوجد رأس أعمدة.`);
    for (const key of ['line', 'event_id', 'record_type'] as const) {
      if (f.mapping[key] < 0) blockers.push(`${f.name}: عيّن ${CANONICAL[key]}.`);
    }
  });

  const setMap = (fid: string, k: MapKey, idx: number) => {
    setFiles((p) => p.map((f) => {
      if (f.id !== fid) return f;
      const mapping = { ...f.mapping, [k]: idx };
      if (idx >= 0) MAP_KEYS.forEach((other) => { if (other !== k && mapping[other] === idx) mapping[other] = -1; });
      return { ...f, mapping };
    }));
    setSelection({});
    setDtAssoc({ 'E-01': [], 'E-02': [] });
  };

  const commit = () => {
    if (blockers.length) return;
    importFiles(files, true);
  };

  const downloadTemplate = () => {
    const blob = new Blob(['\uFEFF' + TEMPLATE], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'ethmar-production-template.csv';
    a.click();
    URL.revokeObjectURL(url);
  };

  const af = files.find((f) => f.id === activeFile) ?? files[0];

  return (
    <Dialog
      open={importOpen}
      onOpenChange={(o) => {
        setImportOpen(o);
        if (!o) reset();
      }}
    >
      <DialogContent dir="rtl" className="max-h-[92dvh] max-w-4xl overflow-y-auto p-0 sm:rounded-md" data-testid="dialog-import">
        <DialogHeader className="border-b px-5 pt-5 pb-3 text-start sm:text-start">
          <DialogTitle className="text-base">استيراد سجلات الإنتاج من CSV</DialogTitle>
          <DialogDescription className="flex items-start gap-1.5 text-xs">
            <Lock className="mt-0.5 size-3.5 shrink-0" aria-hidden />
            يُقرأ الملف محليًا داخل المتصفح فقط ولا يُرسل ولا يُحفظ. تبقى البيانات مؤقتًا في الذاكرة وتزول عند تحديث الصفحة. لا اتصال بنظام ERP.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-5 px-5 py-4">
          {mappingTarget && (
            <div className="flex flex-wrap items-center justify-between gap-2 rounded-md border bg-secondary p-3 text-sm" role="status">
              <span>انتقلنا إلى ربط الأعمدة تلقائيًا. راجع الحقول أدناه قبل عرض البيانات.</span>
              <Button size="sm" variant="outline" onClick={() => setMappingTarget(null)}>العودة إلى اختيار الملفات</Button>
            </div>
          )}
          {/* Step 1 */}
          <section aria-labelledby="st1" hidden={!!mappingTarget}>
            <h3 id="st1" className="mb-2 flex items-center gap-2 text-sm font-semibold">
              <span className="num grid size-5 place-items-center rounded-full bg-primary text-[11px] text-primary-foreground">1</span>
              الملفات
            </h3>
            <div className="flex flex-wrap items-center gap-2">
              <input ref={inputRef} type="file" accept=".csv,text/csv" multiple className="sr-only" id="csv-input" data-testid="input-csv-files" onChange={(e) => onFiles(e.target.files)} />
              <Button type="button" size="sm" onClick={() => inputRef.current?.click()} data-testid="button-choose-files">
                <FileUp className="size-4" /> اختيار ملفات CSV
              </Button>
              <Button type="button" size="sm" variant="outline" onClick={downloadTemplate} data-testid="button-download-template">
                <Download className="size-4" /> تنزيل قالب الرؤوس فقط
              </Button>
              {files.length > 0 && (
                <Button type="button" size="sm" variant="ghost" onClick={reset} data-testid="button-clear-files">
                  <Trash2 className="size-4" /> مسح الاختيار
                </Button>
              )}
            </div>
            <details className="mt-2 rounded-sm border bg-muted/40 px-3 py-2 text-xs leading-relaxed">
              <summary className="cursor-pointer font-medium">صيغة الملف المقبولة</summary>
              <ul className="mt-2 list-disc space-y-1 ps-5 text-muted-foreground">
                <li>ترميز UTF-8 (مع أو بدون BOM). الفاصل فاصلة <span className="num">,</span> أو فاصلة منقوطة <span className="num">;</span> ويُكتشف تلقائياً من صف الرأس.</li>
                <li>الصف الأول رؤوس الأعمدة. الحقول بين علامتي اقتباس قد تحتوي فواصل أو أسطراً جديدة.</li>
                <li>كل صف سجل واحد: تشغيل إنتاج (مدخل/جيد/هالك/قالب) أو حدث توقف غير مخطط (دقائق فقط). الخطوط المقبولة: E-01 وE-02.</li>
                <li>الأرقام غير سالبة، بالنقطة العشرية ودون فواصل آلاف. الخلية الفارغة تعني «غير معروف» وليست صفراً.</li>
                <li>تُتجاهل الأسطر الفارغة تمامًا فقط. الصفوف الناقصة أو المكررة تبقى ظاهرة مع تنبيه ورقم الصف والقيم الخام.</li>
              </ul>
              <pre dir="ltr" className="num mt-2 overflow-x-auto rounded-sm bg-background px-2 py-1 text-start text-[11px]">{TEMPLATE.trim()}</pre>
            </details>
            {notices.map((n) => (
              <p key={n} className="mt-2 flex items-start gap-1.5 text-xs text-e2">
                <AlertTriangle className="mt-0.5 size-3.5 shrink-0" aria-hidden />
                {n}
              </p>
            ))}
            {files.length > 0 && (
              <ul className="mt-3 divide-y rounded-sm border text-xs">
                {files.map((f) => (
                  <li key={f.id} className="flex flex-wrap items-center gap-x-3 gap-y-1 px-3 py-2" data-testid={`row-file-${f.id}`}>
                    <span className="font-medium break-all">{f.name}</span>
                    <span className="num text-muted-foreground">{fmtNum(f.size)} B</span>
                    <span className="text-muted-foreground">
                      فاصل <span className="num">{f.delimiter}</span> · {f.hadBom ? 'BOM' : 'بدون BOM'} · <span className="num">{f.rows.length}</span> صف بيانات
                      {f.blankLines ? ' · تم تجاهل الأسطر الخالية فقط' : ''}
                    </span>
                    {f.error && <span className="text-destructive">{f.error}</span>}
                    <button
                      type="button"
                      className="ms-auto rounded-sm p-1 hover:bg-muted"
                      aria-label={`إزالة ${f.name}`}
                      data-testid={`button-remove-file-${f.id}`}
                      onClick={() => {
                        setFiles((p) => p.filter((x) => x.id !== f.id));
                        setSelection({});
                        setDtAssoc({ 'E-01': [], 'E-02': [] });
                      }}
                    >
                      <X className="size-3.5" />
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </section>

          {/* Step 2 */}
          {af && af.header && (
            <section ref={mappingRef} tabIndex={-1} aria-labelledby="st2" data-testid="screen-column-mapping">
              <p className="mb-3 text-xs text-muted-foreground">{af.name} — {af.rows.length} صف بيانات. الصفوف الناقصة والمكررة محفوظة للمراجعة.</p>
              {af.error && <p className="mb-3 text-xs text-destructive" role="alert">{af.error}</p>}
              {mappingTarget && notices.map((notice, i) => <p key={i} className="mb-2 text-xs text-e2" role="alert">{notice}</p>)}
              <h3 id="st2" className="mb-2 flex items-center gap-2 text-sm font-semibold">
                <span className="num grid size-5 place-items-center rounded-full bg-primary text-[11px] text-primary-foreground">2</span>
                تعيين الأعمدة
              </h3>
              {files.length > 1 && (
                <div role="tablist" className="mb-2 flex flex-wrap gap-1">
                  {files.map((f) => (
                    <button
                      key={f.id}
                      role="tab"
                      aria-selected={f.id === af.id}
                      onClick={() => setActiveFile(f.id)}
                      data-testid={`tab-file-${f.id}`}
                      className={cn('rounded-sm border px-2 py-1 text-xs', f.id === af.id ? 'border-primary bg-accent text-accent-foreground' : 'hover:bg-muted')}
                    >
                      {f.name}
                    </button>
                  ))}
                </div>
              )}
              <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                {MAP_KEYS.map((k) => (
                  <label key={k} className="flex flex-col gap-1 text-xs">
                    <span className={cn('font-medium', k === 'line' && 'text-primary')}>{MAP_LABEL[k]}</span>
                    <select
                      value={af.mapping[k]}
                      onChange={(e) => setMap(af.id, k, Number(e.target.value))}
                      data-testid={`select-map-${k}`}
                      className="h-9 rounded-sm border border-input bg-card px-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                    >
                      <option value={-1}>{k === 'line' ? '— اختر عموداً —' : 'غير موجود (غير معروف)'}</option>
                      {af.header!.cells.map((h, i) => (
                        <option key={i} value={i}>
                          {h.trim() || `عمود ${i + 1}`}
                        </option>
                      ))}
                    </select>
                  </label>
                ))}
              </div>
            </section>
          )}

          {/* Step 3 */}
          {candidates.length > 0 && (
            <section aria-labelledby="st3" className="space-y-3">
              <h3 id="st3" className="flex items-center gap-2 text-sm font-semibold">
                <span className="num grid size-5 place-items-center rounded-full bg-primary text-[11px] text-primary-foreground">3</span>
                التحقق واختيار التشغيل
                <span className="text-xs font-normal text-muted-foreground">
                  <span className="num">{valid.length}</span> صالح · <span className="num">{invalid.length}</span> بأخطاء
                </span>
              </h3>
              {invalid.length > 0 && (
                <div className="rounded-sm border border-destructive/40 bg-destructive/5 p-3" role="alert">
                  <p className="mb-2 text-xs font-semibold text-destructive">صفوف لم تجتز التحقق (لم تُحذف — تُعرض للتصحيح):</p>
                  <ul className="max-h-48 space-y-2 overflow-auto text-xs">
                    {invalid.map((c) => (
                      <li key={c.rec.id} data-testid={`row-error-${c.rec.id}`}>
                        <div className="font-medium">
                          {c.rec.fileName} · الصف الفعلي <span className="num">{c.rec.physicalRow}</span>
                        </div>
                        <pre dir="ltr" className="num my-0.5 truncate text-start text-[11px] text-muted-foreground">{c.rec.rawText}</pre>
                        <ul className="list-disc ps-5 text-destructive">
                          {c.errors.map((e) => (
                            <li key={e}>{e}</li>
                          ))}
                        </ul>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
              {invalid.length === 0 && fileErrors.length === 0 && (
                <div className="grid gap-3 md:grid-cols-2">
                  {LINES.map((l) => {
                    const prods = prodByLine(l);
                    const dts = dtByLine(l);
                    const sel = effSel(l);
                    return (
                      <fieldset key={l} className="rounded-md border p-3">
                        <legend className={cn('num px-1 text-sm font-semibold', l === 'E-01' ? 'text-e1' : 'text-e2')}>{l}</legend>
                        <p className="mb-2 text-[11px] text-muted-foreground">صف تشغيل واحد فقط — لا يُجمع أي تشغيلين.</p>
                        {prods.length === 0 && <p className="text-xs text-destructive">لا يوجد صف تشغيل صالح.</p>}
                        <div className="space-y-1.5">
                          {prods.map((c) => (
                            <label key={c.rec.id} className={cn('flex cursor-pointer items-start gap-2 rounded-sm border p-2 text-xs', sel === c.rec.id ? 'border-primary bg-accent/60' : 'hover:bg-muted/60')}>
                              <input
                                type="radio"
                                name={`sel-${l}`}
                                className="mt-0.5 accent-[hsl(var(--primary))]"
                                checked={sel === c.rec.id}
                                onChange={() => setSelection((p) => ({ ...p, [l]: c.rec.id }))}
                                data-testid={`radio-select-${c.rec.id}`}
                              />
                              <span className="min-w-0 flex-1">
                                <span className="block font-medium">
                                  {c.rec.fileName} · صف <span className="num">{c.rec.physicalRow}</span>
                                </span>
                                <span className="num block text-start text-muted-foreground" dir="ltr">
                                  {PROD_FIELDS.map((k) => `${FIELD_META[k].csv}=${c.rec.values[k]?.value ?? '?'}`).join('  ')}
                                </span>
                                {c.rec.warnings.map((w) => (
                                  <span key={w} className="block text-e2">{w}</span>
                                ))}
                              </span>
                            </label>
                          ))}
                        </div>
                        <div className="mt-3 border-t pt-2">
                          <p className="mb-1 text-[11px] font-medium">أحداث التوقف غير المخطط المرتبطة بهذا التشغيل</p>
                          {dts.length === 0 ? (
                            <p className="text-[11px] text-muted-foreground">لا توجد أحداث — سيُعرض التوقف «غير معروف».</p>
                          ) : (
                            dts.map((c) => (
                              <label key={c.rec.id} className="flex items-center gap-2 py-0.5 text-xs">
                                <input
                                  type="checkbox"
                                  className="accent-[hsl(var(--primary))]"
                                  checked={dtAssoc[l].includes(c.rec.id)}
                                  onChange={(e) =>
                                    setDtAssoc((p) => ({
                                      ...p,
                                      [l]: e.target.checked ? [...p[l], c.rec.id] : p[l].filter((x) => x !== c.rec.id),
                                    }))
                                  }
                                  data-testid={`checkbox-downtime-${c.rec.id}`}
                                />
                                <span>
                                  {c.rec.id === sel ? 'من صف التشغيل نفسه' : `${c.rec.fileName} صف ${c.rec.physicalRow}`} —{' '}
                                  <span className="num">{fmtNum(c.rec.values.downtime!.value!)}</span> دقيقة
                                  {c.rec.warnings.map((w) => <span key={w} className="block text-e2">{w}</span>)}
                                </span>
                              </label>
                            ))
                          )}
                          <p className="mt-1 text-[10px] text-muted-foreground">لا يُربط أي حدث تلقائياً؛ حدّد فقط ما يخص هذا التشغيل صراحةً.</p>
                        </div>
                      </fieldset>
                    );
                  })}
                </div>
              )}
            </section>
          )}
        </div>

        <DialogFooter className="sticky bottom-0 flex-col gap-2 border-t bg-background/95 px-5 py-3 backdrop-blur sm:flex-row sm:items-center sm:justify-between sm:space-x-0">
          <div className="text-xs" aria-live="polite">
            {blockers.length ? (
              <span className="flex items-start gap-1.5 text-muted-foreground">
                <AlertTriangle className="mt-0.5 size-3.5 shrink-0 text-e2" aria-hidden />
                {blockers[0]}
                {blockers.length > 1 ? ` (+${blockers.length - 1})` : ''}
              </span>
            ) : (
              <span className="flex items-center gap-1.5 text-e1">
                <CheckCircle2 className="size-3.5" aria-hidden /> جاهز للعرض. سيصبح هذا الاستيراد المصدر النشط.
              </span>
            )}
          </div>
          <div className="flex gap-2">
            <Button type="button" variant="outline" size="sm" onClick={() => { setImportOpen(false); reset(); }} data-testid="button-cancel-import">
              إلغاء
            </Button>
            <Button type="button" size="sm" disabled={blockers.length > 0} onClick={commit} data-testid="button-confirm-import">
              عرض البيانات المستوردة
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
