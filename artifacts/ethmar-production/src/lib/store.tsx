import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from 'react';
import { USER_DATASET, type Dataset, type Metric, type SourceRecord, type LineId } from './data';

export type TraceTarget = { metric: Metric } | { recordId: string };

type Store = {
  datasets: Dataset[];
  active: Dataset;
  setActiveId: (id: string) => void;
  addDataset: (ds: Dataset) => void;
  selectRecord: (datasetId: string, line: LineId, recordId: string) => void;
  toggleDowntime: (datasetId: string, line: LineId, recordId: string) => void;
  byId: Map<string, SourceRecord>;
  trace: TraceTarget | null;
  openTrace: (t: TraceTarget) => void;
  closeTrace: () => void;
  importOpen: boolean;
  setImportOpen: (v: boolean) => void;
};

const Ctx = createContext<Store | null>(null);

export function StoreProvider({ children }: { children: ReactNode }) {
  const [datasets, setDatasets] = useState<Dataset[]>([USER_DATASET]);
  const [activeId, setActiveId] = useState(USER_DATASET.id);
  const [trace, setTrace] = useState<TraceTarget | null>(null);
  const [importOpen, setImportOpen] = useState(false);

  const byId = useMemo(() => {
    const m = new Map<string, SourceRecord>();
    datasets.forEach((d) => d.records.forEach((r) => m.set(r.id, r)));
    return m;
  }, [datasets]);

  const addDataset = useCallback((ds: Dataset) => {
    setDatasets((prev) => [...prev, ds]);
    setActiveId(ds.id);
  }, []);

  const active = datasets.find((d) => d.id === activeId) ?? datasets[0];
  const value: Store = {
    datasets,
    active,
    setActiveId,
    addDataset,
    selectRecord: (datasetId, line, recordId) => setDatasets((prev) => prev.map((ds) => ds.id !== datasetId ? ds : ({
      ...ds, selection: { ...ds.selection, [line]: recordId }, downtime: { ...ds.downtime, [line]: [] },
    }))),
    toggleDowntime: (datasetId, line, recordId) => setDatasets((prev) => prev.map((ds) => ds.id !== datasetId ? ds : ({
      ...ds, downtime: { ...ds.downtime, [line]: ds.downtime[line].includes(recordId)
        ? ds.downtime[line].filter((id) => id !== recordId) : [...ds.downtime[line], recordId] },
    }))),
    byId,
    trace,
    openTrace: setTrace,
    closeTrace: () => setTrace(null),
    importOpen,
    setImportOpen,
  };
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useStore() {
  const s = useContext(Ctx);
  if (!s) throw new Error('StoreProvider missing');
  return s;
}
