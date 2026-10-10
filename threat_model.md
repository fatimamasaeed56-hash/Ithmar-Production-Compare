# Threat Model

## Project Overview

ETHMAR PLASTICS production-comparison app. A pnpm monorepo:

- **artifacts/api-server** — Express 5 API (TypeScript, bundled with esbuild), mounted under `/api`. Uses Drizzle ORM over PostgreSQL, Replit OIDC (`openid-client`) for auth, Replit Object Storage (GCS via sidecar) for CSV uploads, and Google Gemini for an Arabic assistant.
- **artifacts/ethmar-production** — React 19 + Vite SPA frontend (Arabic/RTL). Imports/compares production CSV data and archives snapshots.
- **artifacts/mockup-sandbox** — design/mockup artifact (preview `/__mockup`); treated as dev-only unless proven reachable in production.
- **lib/** — shared packages: `db` (Drizzle schema), `api-zod` (generated Zod schemas), `api-client-react` (generated client), `replit-auth-web`.

Deployed publicly (autoscale) at the Replit app URL. `NODE_ENV=production` assumed in production.

## Assets

- **User sessions & OIDC tokens** — stored in `sessions` table (`sess` jsonb holds `access_token`/`refresh_token`). Compromise allows impersonation.
- **User archives, uploads, activities** — per-owner production data and original CSV files in object storage. PII/business-sensitive.
- **Application secrets** — `DATABASE_URL`, `gemini_api_key`, `REPL_ID`, object-storage sidecar credentials. Server-side only.

## Trust Boundaries

- **Browser → API** — all `/api` requests. Auth established by `authMiddleware` from session cookie (`sid`) or `Authorization: Bearer`. Each route re-checks `req.isAuthenticated()` and scopes DB queries to `req.user.id`.
- **API → PostgreSQL** — Drizzle parameterized queries only.
- **API → Object Storage (GCS sidecar)** — signed PUT/GET URLs; object paths are server-generated UUIDs under the private dir.
- **API → Gemini** — server holds the key; chat input validated and rate-limited per user.
- **Public vs authenticated** — public: `/api/auth/user`, `/api/login`, `/api/callback`, `/api/logout`, `/api/healthz`. Everything else (archives, activities, chat) requires auth.

## Scan Anchors

- Production entry points: `artifacts/api-server/src/routes/{auth,archives,chat,health}.ts`, mounted via `routes/index.ts` under `/api` with `authMiddleware`.
- Auth core: `src/middlewares/authMiddleware.ts`, `src/lib/auth.ts` (OIDC + session store), `src/lib/profile-name.ts`.
- Object storage: `src/lib/objectStorage.ts`, `src/lib/objectAcl.ts`.
- Input validation: `src/lib/archive-validation.ts` and `@workspace/api-zod` generated schemas.
- Frontend: `artifacts/ethmar-production/src` (React SPA). No secrets in bundle; only `import.meta.env.BASE_URL`/`DEV` used.
- Dev-only: `artifacts/mockup-sandbox` — ignore unless production reachability is demonstrated.

## Threat Categories

### Spoofing / Authentication
Replit OIDC with PKCE, state, and nonce. Session IDs are 32 random bytes stored server-side with TTL and refresh-token rotation. Session is cleared/rotated on login. Guarantee: every protected route must establish `req.user` server-side before acting. Currently upheld.

### Tampering / Access Control
All archive/activity/upload/download queries are scoped to `ownerId = req.user.id`; writes additionally enforce origin/`sec-fetch-site` CSRF checks. Object download requires matching `fileId`, `archiveId`, and `ownerId`. Snapshot structure validated by Zod + `validateSelection`. Guarantee: no cross-user object access or client-supplied owner/tenant scope. Currently upheld.

### Information Disclosure
Errors return generic messages; logger redacts auth headers/cookies and never logs provider errors. Gemini key never leaves the server. Open-redirect candidates in `auth.ts` are constrained by `safeReturn()` (local paths only; rejects `//`, backslash, CRLF). Guarantee: no secrets or other users' data in responses/logs. Currently upheld.

### Denial of Service
Chat is rate-limited per user (10/min, single in-flight) with a 45s abort. JSON body limited to 20mb; snapshots capped (≤20000 records, ≤10 files); CSV upload constrained to `.csv`. Residual: 20mb JSON limit is generous but gated behind auth.

### Elevation of Privilege
No role/admin tiers exist; all users are peers scoped to their own data. No injection sinks (parameterized SQL, no shell/eval, escaped `ilike` search). Object paths are server-generated, preventing path traversal.
