import { createHash } from 'node:crypto';
import { and, eq, sql } from 'drizzle-orm';
import { db, archivesTable, archiveUploadsTable } from '@workspace/db';
import { ObjectStorageService } from './objectStorage';

type Transaction = Parameters<Parameters<typeof db.transaction>[0]>[0];
const storage = new ObjectStorageService();
export const duplicateMessage = 'هذا المحتوى محفوظ في حسابك اليوم بالفعل. لم تُنشأ نسخة أخرى. يمكنك فتح النسخة المحفوظة من سجل النشاطات. إذا اخترت عدة ملفات، أزل الملف المكرر وأعد استيراد الباقي.';
export class DuplicateArchiveError extends Error {
  constructor() { super(duplicateMessage); }
}
export const archiveDay = (date: Date) => new Intl.DateTimeFormat('en-CA', {
  timeZone: 'Asia/Hebron', year: 'numeric', month: '2-digit', day: '2-digit',
}).format(date);

export async function hashStoredFile(path: string, size: number) {
  const file = await storage.getObjectEntityFile(path);
  const hash = createHash('sha256');
  let bytes = 0;
  for await (const chunk of file.createReadStream()) {
    bytes += chunk.length;
    if (bytes > 5 * 1024 * 1024 || bytes > size) throw new Error('Upload size mismatch');
    hash.update(chunk);
  }
  if (bytes !== size) throw new Error('Upload incomplete');
  return hash.digest('hex');
}

export async function lockArchiveOwner(tx: Transaction, ownerId: string) {
  // Serialize all imports for this owner across tabs and server instances.
  await tx.execute(sql`SELECT pg_advisory_xact_lock(hashtextextended(${`archive-import:${ownerId}`}, 0))`);
}

export async function checkDailyDuplicates(tx: Transaction, ownerId: string, hashes: string[], now: Date) {
  if (new Set(hashes).size !== hashes.length) throw new DuplicateArchiveError();
  const previous = await tx.select({
    id: archiveUploadsTable.id, hash: archiveUploadsTable.contentHash,
    path: archiveUploadsTable.objectPath, size: archiveUploadsTable.size,
  }).from(archiveUploadsTable).innerJoin(archivesTable, eq(archiveUploadsTable.archiveId, archivesTable.id))
    .where(and(eq(archivesTable.ownerId, ownerId), eq(archiveUploadsTable.ownerId, ownerId),
      sql`to_char(${archivesTable.createdAt} AT TIME ZONE 'Asia/Hebron', 'YYYY-MM-DD') = ${archiveDay(now)}`));
  for (const old of previous) {
    // Old imports remain intact; fingerprint them lazily so they also count today.
    const hash = old.hash ?? await hashStoredFile(old.path, old.size);
    if (!old.hash) await tx.update(archiveUploadsTable).set({ contentHash: hash }).where(eq(archiveUploadsTable.id, old.id));
    if (hashes.includes(hash)) throw new DuplicateArchiveError();
  }
}
