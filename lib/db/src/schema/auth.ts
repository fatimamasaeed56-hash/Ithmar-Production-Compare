import { sql } from 'drizzle-orm';
import { index, integer, jsonb, pgTable, text, timestamp, varchar } from 'drizzle-orm/pg-core';

// (IMPORTANT) This table is mandatory for Replit Auth, don't drop it.
export const sessionsTable = pgTable(
  'sessions',
  {
    sid: varchar('sid').primaryKey(),
    sess: jsonb('sess').notNull(),
    expire: timestamp('expire').notNull(),
  },
  (table) => [index('IDX_session_expire').on(table.expire)],
);

// (IMPORTANT) This table is mandatory for Replit Auth, don't drop it.
export const usersTable = pgTable('users', {
  id: varchar('id')
    .primaryKey()
    .default(sql`gen_random_uuid()`),
  email: varchar('email').unique(),
  firstName: varchar('first_name'),
  lastName: varchar('last_name'),
  profileImageUrl: varchar('profile_image_url'),
  name: varchar('name', { length: 160 }),
  jobDescription: varchar('job_description', { length: 500 }),
  createdAt: timestamp('created_at', { withTimezone: true })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true })
    .notNull()
    .defaultNow()
    .$onUpdate(() => new Date()),
});

export type UpsertUser = typeof usersTable.$inferInsert;
export type User = typeof usersTable.$inferSelect;

export const passwordCredentialsTable = pgTable('password_credentials', {
  email: varchar('email', { length: 254 }).primaryKey(),
  userId: varchar('user_id').notNull().unique().references(() => usersTable.id),
  passwordHash: text('password_hash').notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
});

export const authLimitsTable = pgTable('auth_limits', {
  key: varchar('key', { length: 80 }).primaryKey(),
  attempts: integer('attempts').notNull(),
  windowStart: timestamp('window_start', { withTimezone: true }).notNull().defaultNow(),
});
