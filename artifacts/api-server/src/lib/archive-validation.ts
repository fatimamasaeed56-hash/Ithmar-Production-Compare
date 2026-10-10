import { z } from 'zod/v4';

const values = z.object({
  value: z.number().finite().nonnegative().nullable(),
  raw: z.string(),
  column: z.string().nullable(),
});
const fields = z.object({
  input: values.optional(), good: values.optional(), scrap: values.optional(),
  mold: values.optional(), downtime: values.optional(),
});
export const archiveSnapshot = z.object({
  id: z.string(), origin: z.literal('csv'), title: z.string(),
  files: z.array(z.object({
    name: z.string(), size: z.number().int().nonnegative(), delimiter: z.string(),
    dataRows: z.number().int().nonnegative(), hadBom: z.boolean(),
  })).max(10),
  records: z.array(z.object({
    id: z.string(), datasetId: z.string(), origin: z.literal('csv'), line: z.string(),
    kind: z.enum(['production', 'downtime', 'unknown']),
    rawFields: z.record(z.string(), z.string()).optional(),
    metadata: z.record(z.string(), z.string()).optional(),
    values: fields, rawText: z.string(), physicalRow: z.number().int().positive().nullable(),
    physicalRowEnd: z.number().int().positive().nullable(), fileName: z.string().nullable(),
    label: z.string(), warnings: z.array(z.string()),
  })).max(20000),
  selection: z.object({ 'E-01': z.string(), 'E-02': z.string() }),
  downtime: z.object({ 'E-01': z.array(z.string()), 'E-02': z.array(z.string()) }),
});
export type Snapshot = z.infer<typeof archiveSnapshot>;

export function validateSelection(snapshot: Snapshot) {
  if (new Set(snapshot.records.map((r) => r.id)).size !== snapshot.records.length) return false;
  return (['E-01', 'E-02'] as const).every((line) => {
    const selected = snapshot.selection[line];
    if (selected && !snapshot.records.some((r) => r.id === selected && r.line === line && r.kind === 'production')) return false;
    const downtime = snapshot.downtime[line];
    return new Set(downtime).size === downtime.length && downtime.every((id) =>
      !!selected && snapshot.records.some((r) => r.id === id && r.line === line &&
        (r.kind === 'downtime' || r.id === selected) && r.values.downtime?.value != null));
  });
}

export function describeSelection(snapshot: Snapshot, kind: 'selection' | 'downtime') {
  return (['E-01', 'E-02'] as const).map((line) => {
    const ids = kind === 'selection' ? [snapshot.selection[line]].filter(Boolean) : snapshot.downtime[line];
    return `${line}: ${ids.map((id) => {
      const r = snapshot.records.find((row) => row.id === id);
      return r ? `${r.fileName} — صف ${r.physicalRow}` : 'غير محدد';
    }).join('، ') || 'غير محدد'}`;
  }).join('\n');
}
