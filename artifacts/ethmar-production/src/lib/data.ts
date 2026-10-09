export const LINES = ['E-01', 'E-02'] as const;
export type LineId = (typeof LINES)[number];
export type FieldKey = 'input' | 'good' | 'scrap' | 'mold' | 'downtime';
export const FIELDS: FieldKey[] = ['input', 'good', 'scrap', 'mold', 'downtime'];
export const PROD_FIELDS: FieldKey[] = ['input', 'good', 'scrap', 'mold'];

export type Unit = 'kg' | 'h' | 'min' | '%' | 'pp';
export const UNIT_LABEL: Record<Unit, string> = {
  kg: 'كجم',
  h: 'ساعة',
  min: 'دقيقة',
  '%': '٪',
  pp: 'نقاط مئوية',
};

export const FIELD_META: Record<FieldKey, { label: string; unit: Unit; csv: string }> = {
  input: { label: 'مدخلات المواد', unit: 'kg', csv: 'input_kg' },
  good: { label: 'الإنتاج السليم', unit: 'kg', csv: 'good_output_kg' },
  scrap: { label: 'الخردة', unit: 'kg', csv: 'scrap_kg' },
  mold: { label: 'زمن تغيير القالب', unit: 'h', csv: 'mold_change_hours' },
  downtime: { label: 'التوقف غير المخطط', unit: 'min', csv: 'unplanned_downtime_minutes' },
};

export type Cell = { value: number | null; raw: string; column: string | null };
export type Origin = 'user' | 'csv';

export type SourceRecord = {
  id: string;
  datasetId: string;
  origin: Origin;
  line: string;
  kind: 'production' | 'downtime' | 'unknown';
  rawFields?: Record<string, string>;
  metadata?: Record<string, string>;
  values: Partial<Record<FieldKey, Cell>>;
  rawText: string;
  physicalRow: number | null;
  physicalRowEnd: number | null;
  fileName: string | null;
  label: string;
  warnings: string[];
};

export type FileMeta = { name: string; size: number; delimiter: string; dataRows: number; hadBom: boolean };

export type Dataset = {
  id: string;
  origin: Origin;
  title: string;
  files: FileMeta[];
  records: SourceRecord[];
  selection: Record<LineId, string>;
  downtime: Record<LineId, string[]>;
};

export type Dep = { recordId: string; field: FieldKey };
export type Metric = {
  id: string;
  label: string;
  value: number | null;
  unit: Unit;
  kind: 'raw' | 'derived';
  deps: Dep[];
  formula?: string;
  substitution?: string;
  note?: string;
};

const USER_DS = 'user-message';
const cell = (value: number, raw: string): Cell => ({ value, raw, column: null });

export const USER_DATASET: Dataset = {
  id: USER_DS,
  origin: 'user',
  title: 'بيانات رسالة المستخدم',
  files: [],
  selection: { 'E-01': 'u-e01', 'E-02': 'u-e02' },
  downtime: { 'E-01': [], 'E-02': ['u-e02-dt'] },
  records: [
    {
      id: 'u-e01',
      datasetId: USER_DS,
      origin: 'user',
      line: 'E-01',
      kind: 'production',
      label: 'تشغيل E-01',
      values: {
        input: cell(1000, '1,000 كجم'),
        good: cell(950, '950 كجم'),
        scrap: cell(50, '50 كجم'),
        mold: cell(4, '4 ساعات'),
      },
      rawText: 'E-01: مدخلات 1,000 كجم، إنتاج سليم 950 كجم، خردة 50 كجم، تغيير القالب 4 ساعات.',
      physicalRow: null,
      physicalRowEnd: null,
      fileName: null,
      warnings: ['لم يُذكر أي حدث توقف غير مخطط لهذا الخط؛ القيمة غير معروفة وليست صفراً.'],
    },
    {
      id: 'u-e02',
      datasetId: USER_DS,
      origin: 'user',
      line: 'E-02',
      kind: 'production',
      label: 'تشغيل E-02',
      values: {
        input: cell(1000, '1,000 كجم'),
        good: cell(900, '900 كجم'),
        scrap: cell(100, '100 كجم'),
        mold: cell(6, '6 ساعات'),
      },
      rawText: 'E-02: مدخلات 1,000 كجم، إنتاج سليم 900 كجم، خردة 100 كجم، تغيير القالب 6 ساعات.',
      physicalRow: null,
      physicalRowEnd: null,
      fileName: null,
      warnings: [],
    },
    {
      id: 'u-e02-dt',
      datasetId: USER_DS,
      origin: 'user',
      line: 'E-02',
      kind: 'downtime',
      label: 'حدث توقف غير مخطط — E-02',
      values: { downtime: cell(45, '45 دقيقة') },
      rawText: 'سجل إضافي منفصل لـ E-02: توقف غير مخطط مدته 45 دقيقة.',
      physicalRow: null,
      physicalRowEnd: null,
      fileName: null,
      warnings: ['حدث منفصل عن تغيير القالب؛ لا يُجمع معه.'],
    },
  ],
};

export function fmtNum(v: number): string {
  return v.toLocaleString('en-US', { maximumFractionDigits: 2 });
}
export function fmtSigned(v: number): string {
  if (v === 0) return '0';
  return (v > 0 ? '+' : '−') + fmtNum(Math.abs(v));
}

export type LineMetrics = Record<'input' | 'good' | 'scrap' | 'mold' | 'downtime' | 'yield' | 'scrapRate' | 'balance', Metric>;
export const METRIC_ROWS: { key: keyof LineMetrics; label: string }[] = [
  { key: 'input', label: 'المدخل (خامة)' },
  { key: 'good', label: 'الإنتاج الجيد' },
  { key: 'scrap', label: 'الهالك' },
  { key: 'yield', label: 'نسبة المردود' },
  { key: 'scrapRate', label: 'نسبة الهالك' },
  { key: 'balance', label: 'فرق توازن الكتلة' },
  { key: 'mold', label: 'زمن تغيير القالب' },
  { key: 'downtime', label: 'التوقف غير المخطط' },
];

export function computeLine(ds: Dataset, line: LineId, byId: Map<string, SourceRecord>): LineMetrics {
  const prod = byId.get(ds.selection[line]);
  const v = (f: FieldKey) => prod?.values[f]?.value ?? null;
  const raw = (f: FieldKey, label: string): Metric => ({
    id: `${line}-${f}`,
    label: `${label} — ${line}`,
    value: v(f),
    unit: FIELD_META[f].unit,
    kind: 'raw',
    deps: prod ? [{ recordId: prod.id, field: f }] : [],
    note: v(f) === null ? 'الخلية فارغة أو غير مُعيَّنة في السجل المصدر — القيمة غير معروفة.' : undefined,
  });
  const input = raw('input', 'المدخل');
  const good = raw('good', 'الإنتاج الجيد');
  const scrap = raw('scrap', 'الهالك');
  const mold = raw('mold', 'زمن تغيير القالب');

  const dtRecs = ds.downtime[line].map((id) => byId.get(id)).filter(Boolean) as SourceRecord[];
  const dtVals = dtRecs.map((r) => r.values.downtime?.value ?? null);
  const dtKnown = dtRecs.length > 0 && dtVals.every((x) => x !== null);
  const downtime: Metric = {
    id: `${line}-downtime`,
    label: `التوقف غير المخطط — ${line}`,
    value: dtKnown ? (dtVals as number[]).reduce((a, b) => a + b, 0) : null,
    unit: 'min',
    kind: dtRecs.length > 1 ? 'derived' : 'raw',
    deps: dtRecs.map((r) => ({ recordId: r.id, field: 'downtime' as FieldKey })),
    formula: dtRecs.length > 1 ? 'مجموع أحداث التوقف المرتبطة صراحةً بهذا التشغيل' : undefined,
    substitution: dtRecs.length > 1 && dtKnown ? `${(dtVals as number[]).map(fmtNum).join(' + ')} = ${fmtNum((dtVals as number[]).reduce((a, b) => a + b, 0))}` : undefined,
    note:
      dtRecs.length === 0
        ? 'لا يوجد سجل توقف غير مخطط مرتبط بهذا التشغيل. القيمة غير معروفة وليست صفراً. تُعرض منفصلة عن زمن تغيير القالب.'
        : dtKnown
          ? 'تُعرض منفصلة عن زمن تغيير القالب ولا تُجمع معه.'
          : 'أحد سجلات التوقف المرتبطة يحتوي خلية فارغة — القيمة غير معروفة.',
  };

  const iv = input.value;
  const ratio = (num: Metric, id: string, label: string, fname: string): Metric => {
    const ok = num.value !== null && iv !== null && iv > 0;
    const val = ok ? (num.value! / iv!) * 100 : null;
    return {
      id: `${line}-${id}`,
      label: `${label} — ${line}`,
      value: val,
      unit: '%',
      kind: 'derived',
      deps: [...num.deps, ...input.deps],
      formula: `${fname} ÷ المدخل × 100`,
      substitution: ok ? `${fmtNum(num.value!)} ÷ ${fmtNum(iv!)} × 100 = ${fmtNum(val!)}%` : undefined,
      note: ok ? undefined : iv === 0 ? 'المدخل صفر — النسبة غير معرّفة.' : 'أحد المدخلات غير معروف — لا يمكن حساب النسبة.',
    };
  };
  const yieldM = ratio(good, 'yield', 'نسبة المردود', 'الإنتاج الجيد');
  const scrapRate = ratio(scrap, 'scrapRate', 'معدل الخردة', 'كمية الخردة');
  const balOk = iv !== null && good.value !== null && scrap.value !== null;
  const balVal = balOk ? iv! - good.value! - scrap.value! : null;
  const balance: Metric = {
    id: `${line}-balance`,
    label: `فرق توازن الكتلة — ${line}`,
    value: balVal,
    unit: 'kg',
    kind: 'derived',
    deps: [...input.deps, ...good.deps, ...scrap.deps],
    formula: 'المدخل − الإنتاج الجيد − الهالك',
    substitution: balOk ? `${fmtNum(iv!)} − ${fmtNum(good.value!)} − ${fmtNum(scrap.value!)} = ${fmtNum(balVal!)}` : undefined,
    note: balOk
      ? balVal === 0
        ? 'المدخل يساوي مجموع الجيد والهالك في السجل المصدر.'
        : 'المدخل لا يساوي مجموع الجيد والهالك. هذا فرق حسابي فقط ولا يحدد سبباً.'
      : 'أحد المدخلات غير معروف.',
  };
  return { input, good, scrap, mold, downtime, yield: yieldM, scrapRate, balance };
}

export function diffMetric(a: Metric, b: Metric, key: string, label: string, order = 'E-02 − E-01'): Metric {
  const ok = a.value !== null && b.value !== null;
  const pct = a.unit === '%';
  const unit: Unit = pct ? 'pp' : a.unit;
  const val = ok ? a.value! - b.value! : null;
  const ua = pct ? '٪' : '';
  return {
    id: `diff-${key}`,
    label: `فرق ${label} (${order})`,
    value: val,
    unit,
    kind: 'derived',
    deps: [...a.deps, ...b.deps],
    formula: `${label}: ${order}${pct ? ' (بالنقاط المئوية)' : ''}`,
    substitution: ok ? `${fmtNum(a.value!)}${ua} − ${fmtNum(b.value!)}${ua} = ${fmtSigned(val!)} ${UNIT_LABEL[unit]}` : undefined,
    note: ok
      ? 'فرق حسابي بين سجلين فقط؛ لا يُستنتج منه سبب.'
      : 'أحد الطرفين غير معروف — لا يمكن حساب الفرق، ولا تُعامل القيمة غير المعروفة كصفر.',
  };
}
