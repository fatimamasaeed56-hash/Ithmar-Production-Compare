import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { createArchive, listArchives, prepareArchiveUpload, updateArchive, type Archive, type ArchiveUpdate } from '@workspace/api-client-react';
import { USER_DATASET, type Dataset, type Metric, type SourceRecord, type LineId } from './data';

export type TraceTarget = { metric: Metric } | { recordId: string };
type SaveState = { status: 'saving' | 'saved' | 'error'; message?: string };
type Store = {
  datasets: Dataset[]; active: Dataset; setActiveId: (id: string) => void;
  addDataset: (ds: Dataset, files: File[]) => Promise<void>;
  notes: Record<string, string>; setNote: (datasetId: string, text: string) => void;
  selectRecord: (datasetId: string, line: LineId, recordId: string) => void;
  toggleDowntime: (datasetId: string, line: LineId, recordId: string) => void;
  byId: Map<string, SourceRecord>; trace: TraceTarget | null;
  openTrace: (t: TraceTarget) => void; closeTrace: () => void;
  importOpen: boolean; setImportOpen: (v: boolean) => void;
  archives: Archive[]; isArchiveLoading: boolean; archiveError: string | null;
  reloadArchives: () => Promise<void>; saveStates: Record<string, SaveState>;
  retrySave: (id: string) => void; restoreSaved: (id: string) => Promise<void>;
};
const Ctx = createContext<Store | null>(null);
const asDataset = (archive: Archive) => archive.snapshot as unknown as Dataset;
const errorMessage = (error: unknown) => {
  const e = error as { status?: number };
  return e?.status === 409
    ? 'توجد نسخة أحدث في الحساب. ملاحظاتك الحالية لم تُحفظ؛ انسخها قبل استعادة النسخة المحفوظة.'
    : e?.status === 401 ? 'انتهت جلسة الدخول. التغييرات الحالية لم تُحفظ؛ انسخ الملاحظات ثم سجّل الدخول.'
      : 'تعذر الحفظ في الحساب. التغييرات الحالية ما زالت في هذه الصفحة فقط؛ أعد المحاولة قبل المغادرة.';
};

export function StoreProvider({ children }: { children: ReactNode }) {
  const queryClient = useQueryClient();
  const [datasets, setDatasets] = useState<Dataset[]>([USER_DATASET]);
  const [activeId, setActiveId] = useState(USER_DATASET.id);
  const [trace, setTrace] = useState<TraceTarget | null>(null);
  const [importOpen, setImportOpen] = useState(false);
  const [notes, setNotes] = useState<Record<string, string>>({});
  const [archives, setArchives] = useState<Archive[]>([]);
  const [isArchiveLoading, setIsArchiveLoading] = useState(true);
  const [archiveError, setArchiveError] = useState<string | null>(null);
  const [saveStates, setSaveStates] = useState<Record<string, SaveState>>({});
  const archiveRef = useRef(new Map<string, Archive>());
  const datasetRef = useRef(datasets);
  datasetRef.current = datasets;
  const pending = useRef(new Map<string, Omit<ArchiveUpdate, 'revision'>>());
  const busy = useRef(new Set<string>());
  const timers = useRef(new Map<string, ReturnType<typeof setTimeout>>());
  const mounted = useRef(true);
  const loadVersion = useRef(0);
  const dirty = (id: string) => pending.current.has(id) || busy.current.has(id);
  const invalidateHistory = () => { void queryClient.invalidateQueries({ queryKey: ['activities'] }); };

  const reloadArchives = useCallback(async () => {
    const version = ++loadVersion.current;
    setArchiveError(null);
    try {
      const rows = await listArchives();
      if (!mounted.current || version !== loadVersion.current) return;
      const fresh = rows.filter((row) => !dirty(row.id) && row.revision >= (archiveRef.current.get(row.id)?.revision ?? 0));
      for (const row of fresh) archiveRef.current.set(row.id, row);
      setArchives([...archiveRef.current.values()]);
      setDatasets((prev) => [USER_DATASET, ...[...archiveRef.current.values()].map((row) =>
        dirty(row.id) ? prev.find((d) => d.id === row.id) ?? asDataset(row) : asDataset(row))]);
      setNotes((prev) => ({ ...prev, ...Object.fromEntries(fresh.map((r) => [r.id, r.note])) }));
    } catch {
      if (mounted.current) setArchiveError('تعذر تحميل الملفات المحفوظة في حسابك. أعد المحاولة؛ لم تُحذف بياناتك.');
    } finally { if (mounted.current) setIsArchiveLoading(false); }
  }, []);

  const pump = useCallback(async (id: string) => {
    if (busy.current.has(id) || !mounted.current) return;
    const change = pending.current.get(id);
    const saved = archiveRef.current.get(id);
    if (!change || !saved) return;
    busy.current.add(id);
    pending.current.delete(id);
    setSaveStates((s) => ({ ...s, [id]: { status: 'saving' } }));
    try {
      const result = await updateArchive(id, { revision: saved.revision, ...change });
      if (!mounted.current) return;
      archiveRef.current.set(id, result);
      setArchives([...archiveRef.current.values()]);
      invalidateHistory();
      setSaveStates((s) => ({ ...s, [id]: { status: pending.current.has(id) ? 'saving' : 'saved' } }));
    } catch (error) {
      pending.current.set(id, { ...change, ...pending.current.get(id) });
      if (mounted.current) setSaveStates((s) => ({ ...s, [id]: { status: 'error', message: errorMessage(error) } }));
      busy.current.delete(id);
      return;
    }
    busy.current.delete(id);
    if (pending.current.has(id)) void pump(id);
  }, [queryClient]);

  useEffect(() => {
    mounted.current = true;
    void reloadArchives();
    const focus = () => { void reloadArchives(); };
    const beforeUnload = (event: BeforeUnloadEvent) => {
      if (pending.current.size || busy.current.size) { event.preventDefault(); event.returnValue = ''; }
    };
    window.addEventListener('focus', focus);
    window.addEventListener('beforeunload', beforeUnload);
    return () => {
      mounted.current = false;
      timers.current.forEach(clearTimeout);
      window.removeEventListener('focus', focus);
      window.removeEventListener('beforeunload', beforeUnload);
    };
  }, [reloadArchives]);

  const enqueue = (id: string, change: Omit<ArchiveUpdate, 'revision'>) => {
    pending.current.set(id, { ...pending.current.get(id), ...change });
    setSaveStates((s) => ({ ...s, [id]: { status: 'saving' } }));
    clearTimeout(timers.current.get(id));
    timers.current.set(id, setTimeout(() => { void pump(id); }, 600));
  };
  const addDataset = async (ds: Dataset, files: File[]) => {
    const uploadIds: string[] = [];
    if (!files.length || files.length > 10 || files.some((f) => f.size > 5 * 1024 * 1024) || files.reduce((sum, f) => sum + f.size, 0) > 10 * 1024 * 1024) {
      throw new Error('الحد 10 ملفات، 5 ميجابايت للملف و10 ميجابايت للاستيراد الواحد.');
    }
    if (new TextEncoder().encode(JSON.stringify(ds)).length > 18 * 1024 * 1024) throw new Error('بيانات الملف كبيرة جدًا؛ قسّم التصدير إلى ملفات أصغر.');
    const fingerprints = await Promise.all(files.map(async (file) => {
      const hash = await crypto.subtle.digest('SHA-256', await file.arrayBuffer());
      return Array.from(new Uint8Array(hash), (b) => b.toString(16).padStart(2, '0')).join('');
    }));
    if (new Set(fingerprints).size !== fingerprints.length) {
      throw new Error('اخترت نفس محتوى الملف أكثر من مرة في هذه العملية. أزل النسخة المكررة؛ لم تُحفظ أي ملفات من هذه العملية بعد.');
    }
    for (const [index, file] of files.entries()) {
      const reservation = await prepareArchiveUpload({ name: file.name, size: file.size, sha256: fingerprints[index] });
      const response = await fetch(reservation.uploadURL, { method: 'PUT', body: file, headers: { 'Content-Type': 'text/csv' }, credentials: 'omit' });
      if (!response.ok) throw new Error('تعذر رفع الملف إلى حسابك. أعد المحاولة.');
      uploadIds.push(reservation.id);
    }
    const saved = await createArchive({ id: ds.id, title: ds.title, uploadIds, snapshot: ds as unknown as Record<string, unknown> });
    archiveRef.current.set(saved.id, saved);
    setArchives([...archiveRef.current.values()]);
    setDatasets((prev) => [...prev.filter((d) => d.id !== saved.id), asDataset(saved)]);
    setNotes((prev) => ({ ...prev, [saved.id]: saved.note }));
    setSaveStates((s) => ({ ...s, [saved.id]: { status: 'saved' } }));
    setActiveId(saved.id);
    invalidateHistory();
  };
  const replaceDataset = (ds: Dataset) => {
    datasetRef.current = datasetRef.current.map((d) => d.id === ds.id ? ds : d);
    setDatasets(datasetRef.current);
  };
  const byId = useMemo(() => new Map(datasets.flatMap((d) => d.records.map((r) => [r.id, r] as const))), [datasets]);
  const active = datasets.find((d) => d.id === activeId) ?? datasets[0];
  const value: Store = {
    datasets, active, setActiveId, addDataset, notes, archives, isArchiveLoading, archiveError, reloadArchives, saveStates,
    retrySave: (id) => { void pump(id); },
    restoreSaved: async (id) => {
      if (busy.current.has(id)) return;
      if (!window.confirm('سيتم استبدال التغييرات غير المحفوظة لهذا الجدول بالنسخة الموجودة في الحساب. هل تريد المتابعة؟')) return;
      try {
        const rows = await listArchives();
        const row = rows.find((r) => r.id === id);
        if (!row) throw new Error('Missing archive');
        clearTimeout(timers.current.get(id));
        pending.current.delete(id);
        archiveRef.current.set(id, row);
        setArchives([...archiveRef.current.values()]);
        replaceDataset(asDataset(row));
        setNotes((n) => ({ ...n, [id]: row.note }));
        setSaveStates((s) => ({ ...s, [id]: { status: 'saved' } }));
      } catch { setArchiveError('تعذر استعادة النسخة المحفوظة. لم تتغير ملاحظاتك الحالية.'); }
    },
    setNote: (id, text) => {
      setNotes((previous) => ({ ...previous, [id]: text }));
      enqueue(id, { note: text });
    },
    selectRecord: (id, line, recordId) => {
      const ds = datasetRef.current.find((d) => d.id === id);
      if (!ds) return;
      const updated = { ...ds, selection: { ...ds.selection, [line]: recordId }, downtime: { ...ds.downtime, [line]: [] } };
      replaceDataset(updated);
      if (ds.origin === 'csv') enqueue(id, { selection: updated.selection, downtime: updated.downtime });
    },
    toggleDowntime: (id, line, recordId) => {
      const ds = datasetRef.current.find((d) => d.id === id);
      if (!ds) return;
      const updated = { ...ds, downtime: { ...ds.downtime, [line]: ds.downtime[line].includes(recordId) ? ds.downtime[line].filter((x) => x !== recordId) : [...ds.downtime[line], recordId] } };
      replaceDataset(updated);
      if (ds.origin === 'csv') enqueue(id, { downtime: updated.downtime });
    },
    byId, trace, openTrace: setTrace, closeTrace: () => setTrace(null), importOpen, setImportOpen,
  };
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}
export function useStore() {
  const s = useContext(Ctx);
  if (!s) throw new Error('StoreProvider missing');
  return s;
}
