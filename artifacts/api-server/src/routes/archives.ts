import { Router, type Request, type Response } from 'express';
import { randomUUID } from 'node:crypto';
import { pipeline } from 'node:stream/promises';
import { and, desc, eq, ilike, inArray, or, sql } from 'drizzle-orm';
import { db, archivesTable, archiveUploadsTable, activitiesTable, type ArchiveRow } from '@workspace/db';
import {
  PrepareArchiveUploadBody, PrepareArchiveUploadResponse, CreateArchiveBody, CreateArchiveResponse,
  ListArchivesResponse, UpdateArchiveParams, UpdateArchiveBody, UpdateArchiveResponse,
  ListActivitiesQueryParams, ListActivitiesResponse, DownloadArchiveFileParams,
} from '@workspace/api-zod';
import { ObjectStorageService } from '../lib/objectStorage';
import { archiveSnapshot, describeSelection, validateSelection } from '../lib/archive-validation';

const router = Router();
const storage = new ObjectStorageService();

router.use(['/archives', '/activities'], (req, res, next) => {
  res.set('Cache-Control', 'private, no-store');
  if (!req.isAuthenticated()) { res.status(401).json({ error: 'يلزم تسجيل الدخول.' }); return; }
  if (req.method !== 'GET') {
    const origin = req.get('origin');
    const host = req.get('x-forwarded-host') || req.get('host');
    if (req.get('sec-fetch-site') === 'cross-site' || (origin && new URL(origin).host !== host)) {
      res.status(403).json({ error: 'طلب غير مسموح.' }); return;
    }
  }
  next();
});

async function serialize(row: ArchiveRow) {
  const files = await db.select({ id: archiveUploadsTable.id, name: archiveUploadsTable.name, size: archiveUploadsTable.size })
    .from(archiveUploadsTable).where(and(eq(archiveUploadsTable.archiveId, row.id), eq(archiveUploadsTable.ownerId, row.ownerId)));
  return { id: row.id, title: row.title, snapshot: row.snapshot, note: row.note, revision: row.revision, createdAt: row.createdAt, updatedAt: row.updatedAt, files };
}
function failed(req: Request, res: Response, error: unknown) {
  req.log.error({ errorName: error instanceof Error ? error.name : 'Error' }, 'Archive operation failed');
  if (!res.headersSent) res.status(503).json({ error: 'تعذر حفظ أو تحميل السجل. لم تُؤكَّد العملية؛ أعد المحاولة.' });
}

router.post('/archives/uploads', async (req, res) => {
  const body = PrepareArchiveUploadBody.safeParse(req.body);
  if (!body.success || !body.data.name.toLowerCase().endsWith('.csv')) { res.status(400).json({ error: 'اختر ملف CSV بحجم لا يتجاوز 5 ميجابايت.' }); return; }
  try {
    const uploadURL = await storage.getObjectEntityUploadURL();
    const id = randomUUID();
    await db.insert(archiveUploadsTable).values({ id, ownerId: req.user!.id, ...body.data, objectPath: storage.normalizeObjectEntityPath(uploadURL) });
    res.json(PrepareArchiveUploadResponse.parse({ id, uploadURL }));
  } catch (error) { failed(req, res, error); }
});

router.get('/archives', async (req, res) => {
  try {
    const rows = await db.select().from(archivesTable).where(eq(archivesTable.ownerId, req.user!.id)).orderBy(desc(archivesTable.createdAt));
    res.json(ListArchivesResponse.parse(await Promise.all(rows.map(serialize))));
  } catch (error) { failed(req, res, error); }
});

router.post('/archives', async (req, res) => {
  const body = CreateArchiveBody.safeParse(req.body);
  if (!body.success) { res.status(400).json({ error: 'بيانات الاستيراد غير صالحة.' }); return; }
  const parsed = archiveSnapshot.safeParse(body.data.snapshot);
  if (!parsed.success || !validateSelection(parsed.data)) { res.status(400).json({ error: 'بنية السجل أو ارتباطات الصفوف غير صالحة.' }); return; }
  const data = body.data;
  const ownerId = req.user!.id;
  try {
    const [existing] = await db.select().from(archivesTable).where(eq(archivesTable.id, data.id));
    if (existing) {
      if (existing.ownerId !== ownerId) { res.status(404).json({ error: 'غير موجود.' }); return; }
      res.status(201).json(CreateArchiveResponse.parse(await serialize(existing))); return;
    }
    const uploads = await db.select().from(archiveUploadsTable).where(and(eq(archiveUploadsTable.ownerId, ownerId), inArray(archiveUploadsTable.id, data.uploadIds)));
    if (uploads.length !== data.uploadIds.length || uploads.some((f) => f.archiveId) || uploads.length !== parsed.data.files.length) {
      res.status(400).json({ error: 'الملفات غير متاحة لهذا الحساب.' }); return;
    }
    for (const upload of uploads) {
      const file = await storage.getObjectEntityFile(upload.objectPath);
      const [meta] = await file.getMetadata();
      if (Number(meta.size) !== upload.size) { res.status(400).json({ error: 'لم يكتمل رفع الملف. أعد الاستيراد.' }); return; }
    }
    const snapshot = { ...parsed.data, id: data.id, title: data.title, records: parsed.data.records.map((r) => ({ ...r, datasetId: data.id })) };
    const created = await db.transaction(async (tx) => {
      const locked = await tx.select().from(archiveUploadsTable).where(and(eq(archiveUploadsTable.ownerId, ownerId), inArray(archiveUploadsTable.id, data.uploadIds))).for('update');
      if (locked.some((f) => f.archiveId)) throw new Error('Upload already used');
      const [row] = await tx.insert(archivesTable).values({ id: data.id, ownerId, title: data.title, snapshot }).returning();
      await tx.update(archiveUploadsTable).set({ archiveId: row.id }).where(and(eq(archiveUploadsTable.ownerId, ownerId), inArray(archiveUploadsTable.id, data.uploadIds)));
      await tx.insert(activitiesTable).values({ id: randomUUID(), ownerId, archiveId: row.id, title: row.title, kind: 'import', after: uploads.map((f) => f.name).join('\n') });
      return row;
    });
    res.status(201).json(CreateArchiveResponse.parse(await serialize(created)));
  } catch (error) { failed(req, res, error); }
});

router.patch('/archives/:id', async (req, res) => {
  const params = UpdateArchiveParams.safeParse(req.params);
  const body = UpdateArchiveBody.safeParse(req.body);
  if (!params.success || !body.success) { res.status(400).json({ error: 'التعديل غير صالح.' }); return; }
  try {
    const result = await db.transaction(async (tx) => {
      const [row] = await tx.select().from(archivesTable).where(and(eq(archivesTable.id, params.data.id), eq(archivesTable.ownerId, req.user!.id))).for('update');
      if (!row) return { status: 404 as const };
      if (row.revision !== body.data.revision) return { status: 409 as const };
      const previous = archiveSnapshot.parse(row.snapshot);
      const snapshot = { ...previous, selection: body.data.selection ?? previous.selection, downtime: body.data.downtime ?? previous.downtime };
      if (!validateSelection(snapshot)) return { status: 400 as const };
      const changes: { kind: string; before: string; after: string }[] = [];
      if (body.data.note !== undefined && body.data.note !== row.note) changes.push({ kind: 'note', before: row.note, after: body.data.note });
      for (const kind of ['selection', 'downtime'] as const) {
        if (JSON.stringify(previous[kind]) !== JSON.stringify(snapshot[kind])) changes.push({ kind, before: describeSelection(previous, kind), after: describeSelection(snapshot, kind) });
      }
      if (!changes.length) return { status: 200 as const, row };
      const [updated] = await tx.update(archivesTable).set({ note: body.data.note ?? row.note, snapshot, revision: row.revision + 1, updatedAt: new Date() })
        .where(and(eq(archivesTable.id, row.id), eq(archivesTable.ownerId, req.user!.id))).returning();
      await tx.insert(activitiesTable).values(changes.map((change) => ({ ...change, id: randomUUID(), archiveId: row.id, ownerId: req.user!.id, title: row.title })));
      return { status: 200 as const, row: updated };
    });
    if (result.status !== 200 || !result.row) {
      res.status(result.status).json({ error: result.status === 409 ? 'تغيّر السجل من جلسة أخرى. أعد تحميل السجل قبل المحاولة.' : 'السجل غير متاح أو الاختيار غير صالح.' }); return;
    }
    res.json(UpdateArchiveResponse.parse(await serialize(result.row)));
  } catch (error) { failed(req, res, error); }
});

router.get('/archives/:id/files/:fileId', async (req, res) => {
  const parsed = DownloadArchiveFileParams.safeParse(req.params);
  if (!parsed.success) { res.sendStatus(400); return; }
  try {
    const [upload] = await db.select().from(archiveUploadsTable).where(and(eq(archiveUploadsTable.id, parsed.data.fileId), eq(archiveUploadsTable.archiveId, parsed.data.id), eq(archiveUploadsTable.ownerId, req.user!.id)));
    if (!upload) { res.status(404).json({ error: 'الملف غير موجود.' }); return; }
    const file = await storage.getObjectEntityFile(upload.objectPath);
    res.set('Content-Type', 'text/csv; charset=utf-8');
    res.set('Content-Disposition', `attachment; filename="export.csv"; filename*=UTF-8''${encodeURIComponent(upload.name)}`);
    res.set('X-Content-Type-Options', 'nosniff');
    await pipeline(file.createReadStream(), res);
  } catch (error) { failed(req, res, error); }
});

router.get('/activities', async (req, res) => {
  const parsed = ListActivitiesQueryParams.safeParse(req.query);
  if (!parsed.success || (parsed.data.day && !/^\d{4}-\d{2}-\d{2}$/.test(parsed.data.day))) { res.status(400).json({ error: 'البحث غير صالح.' }); return; }
  try {
    const { q, day, offset = 0 } = parsed.data;
    const conditions = [eq(activitiesTable.ownerId, req.user!.id)];
    if (q) {
      const search = `%${q.replace(/[\\%_]/g, '\\$&')}%`;
      conditions.push(or(ilike(activitiesTable.title, search), ilike(activitiesTable.before, search), ilike(activitiesTable.after, search))!);
    }
    if (day) conditions.push(sql`to_char(${activitiesTable.createdAt} AT TIME ZONE 'Asia/Hebron', 'YYYY-MM-DD') = ${day}`);
    const rows = await db.select().from(activitiesTable).where(and(...conditions)).orderBy(desc(activitiesTable.createdAt), desc(activitiesTable.id)).limit(51).offset(offset);
    res.json(ListActivitiesResponse.parse({ items: rows.slice(0, 50), hasMore: rows.length > 50 }));
  } catch (error) { failed(req, res, error); }
});

export default router;
