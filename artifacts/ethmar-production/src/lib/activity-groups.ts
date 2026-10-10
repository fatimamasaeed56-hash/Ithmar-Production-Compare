import type { Activity, Archive } from '@workspace/api-client-react';
import type { Dataset } from './data';

/** Group repeated activity entries without removing any saved event or archive. */
export function groupActivities(items: Activity[], archives: Archive[]) {
  const keys = new Map(archives.map((archive) => {
    const snapshot = archive.snapshot as unknown as Dataset;
    const key = snapshot.records?.length && snapshot.files?.length
      ? JSON.stringify({
          files: snapshot.files,
          rows: snapshot.records.map((r) => ({
            file: r.fileName, row: r.physicalRow, end: r.physicalRowEnd,
            text: r.rawText, raw: r.rawFields,
          })),
        })
      : archive.id;
    return [archive.id, key];
  }));
  const groups = new Map<string, Activity[]>();
  for (const item of items) {
    const key = keys.get(item.archiveId) ?? item.archiveId;
    const group = groups.get(key) ?? [];
    group.push(item);
    groups.set(key, group);
  }
  return [...groups.values()].map((events) =>
    events.sort((a, b) => b.createdAt.localeCompare(a.createdAt)));
}
