import { pgTable, text, integer, timestamp, jsonb, index } from 'drizzle-orm/pg-core';
import { createInsertSchema } from 'drizzle-zod';
import { usersTable } from './auth';

export const archiveUploadsTable = pgTable('archive_uploads', {
  id: text('id').primaryKey(),
  ownerId: text('owner_id').notNull().references(() => usersTable.id),
  name: text('name').notNull(),
  size: integer('size').notNull(),
  objectPath: text('object_path').notNull(),
  contentHash: text('content_hash'),
  archiveId: text('archive_id'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
}, (t) => [index('archive_uploads_owner_idx').on(t.ownerId)]);

export const archivesTable = pgTable('archives', {
  id: text('id').primaryKey(),
  ownerId: text('owner_id').notNull().references(() => usersTable.id),
  title: text('title').notNull(),
  snapshot: jsonb('snapshot').$type<Record<string, unknown>>().notNull(),
  note: text('note').notNull().default(''),
  revision: integer('revision').notNull().default(1),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
}, (t) => [index('archives_owner_idx').on(t.ownerId)]);

export const activitiesTable = pgTable('activities', {
  id: text('id').primaryKey(),
  ownerId: text('owner_id').notNull().references(() => usersTable.id),
  archiveId: text('archive_id').notNull().references(() => archivesTable.id),
  title: text('title').notNull(),
  kind: text('kind').notNull(),
  before: text('before').notNull().default(''),
  after: text('after').notNull().default(''),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
}, (t) => [index('activities_owner_time_idx').on(t.ownerId, t.createdAt)]);

export const insertArchiveSchema = createInsertSchema(archivesTable);
export const insertArchiveUploadSchema = createInsertSchema(archiveUploadsTable);
export const insertActivitySchema = createInsertSchema(activitiesTable);
export type ArchiveRow = typeof archivesTable.$inferSelect;
