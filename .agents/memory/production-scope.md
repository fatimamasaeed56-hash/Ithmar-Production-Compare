---
name: Production comparison scope
description: User-defined evidence and read-only constraints for production comparison
---

ERP means the factory's existing business-management system. CSV is a spreadsheet-like export. This prototype is a read-only view of factory-approved exports and cannot change the original system.

The user explicitly chose independent email/password registration using Gmail or iCloud addresses, not Replit login, and repeated that redirecting to Replit is unwanted. Preserve this choice; do not substitute Replit authentication. Verification and password recovery require real email delivery. Existing private archives must not be automatically reassigned by matching email addresses.

**Why:** The user selected “بريد وكلمة مرور” and reiterated “بدي ادخل من حساب ثاني” after objecting to the Replit redirect.

**How to apply:** Implement independent verified email/password accounts; protect existing ownership and provide a separately authenticated account-linking path rather than weakening sign-in checks.

**Why:** The user explicitly defined the system terminology and wants missing or duplicate source data shown as “مشكلات في البيانات” with a visible error message.

**How to apply:** Explain these terms in the internal tool, not the previously simplified welcome page. Retain problematic rows for tracing; never claim the app independently certifies an imported file. Only report an absent expected run where its expected identity is actually known.
The user wants a read-only tool for the ETHMAR PLASTICS production manager to compare E-01 and E-02 using only user-supplied records, ultimately approved CSV exports. Every value must be traceable to its original source row. The additional E-02 unplanned stoppage is a separate record, not mold-change time.

**Why:** The user explicitly limited the tool to their supplied data and required source-row traceability.

**How to apply:** Do not invent production data or certify imported exports as approved. Distinguish values supplied in chat from actual imported file evidence; absence of a stoppage record is unknown, not zero.

The user explicitly authorized persistent per-account saving of imported CSV files, notes, and activity on 2026-10-10, superseding the earlier browser-memory-only/no-upload rule. They said each person who creates an account must have their own files and activity. Parse CSV in the browser, but save originals privately in App Storage and records/notes/history in the account database. Never expose another user's records or download links without ownership checks. No ERP connection or writes. The user subsequently explicitly requested Arabic Gemini chat, superseding the no-AI rule for the chat only; do not automatically send production files or account records to Gemini. Real login is required. Use React, Vite, and TypeScript. Never silently remove incomplete or duplicate rows; warn and retain reviewability. Do not invent order, machine, mold, shift, or ERP identifiers; any demo identifiers must explicitly say DEMO.

**Why:** The user explicitly confirmed upload/storage consent after being told it replaces the prior local-only behavior: “كل شخص يدخل للموقع ويعمل حساب يحفظ نشاطه وملفاته على حسابه”.

Independent registration requires four fields in this exact order: email, a single name, password, job description. Subsequent login uses email/password only, superseding the previous first/second-name confirmation on every login. Passwords must have more than eight characters with letters, numbers, and symbols; store only a salted password hash, never plaintext.

**Why:** The user explicitly specified these four fields, database persistence, and removing Google sign-in after declining email-service setup.

**How to apply:** Keep files bound to internal account IDs. Existing authenticated legacy sessions may activate a password without changing account IDs; never grant access to legacy files by simply registering the same email. Without a configured mail service, do not claim email verification or recovery works.

The user explicitly cancelled email verification and password recovery: “الغى خدمة التحقق من البريد واستعادة كلمة المرور”.

**Why:** The user requested cancellation after declining mail-service setup.

**How to apply:** Do not resume mail-service setup or add email verification/password recovery unless the user explicitly requests them again. Preserve existing email/password login.

**How to apply:** Show E-02 minus E-01 for the requested scrap-rate and mold-change summaries: +5 percentage points and +2 hours for the supplied records. Keep the 45-minute unplanned stop separate and make no causal inference.

The CSV intake must use PapaParse with header:true and skipEmptyLines:'greedy'. Entirely empty lines, including the trailing newline, are not incomplete data records. Missing values within data rows remain visible with warnings. Recognized run_id, event_id, record_type headers and an error-free parse trigger direct import; alternate headers trigger automatic navigation to column mapping. The same file can be chosen again.

**Why:** The user explicitly specified this import contract and distinguished blank lines from incomplete records.

**How to apply:** Preserve original physical row positions and raw values; do not treat skipped blank lines as records or renumber source rows after skipping them.

The user now wants a general-purpose site usable by any company, without the company logo or company-specific identity, including in the AI assistant. This supersedes earlier requests to place the Ithmar logo on every page and display that company's goals.

**Why:** The user said “احذف شعار اللشركة وعلى مساعد الذكي , خلي كلشي عام يعنى بتقدر اي شركة تستخدم هاد الموقع”.

**How to apply:** Retain the green styling and layout, but use neutral production-comparison wording throughout welcome, login, headers, metadata and assistant identity. Do not reintroduce a company logo or company-specific promises. Preserve existing accounts and data; this is not permission to merge companies' records.

The user explicitly reversed the earlier choice of separate demo access: they now want real login only, no demo access.

**Why:** The user said “مابدي دخول تجريبي بدي دخول حقيقي”.

**How to apply:** Do not reintroduce any-email demo entry or authentication bypass. Keep the language switch and translate all welcome content.

Use the user's supplied welcome/login reference for its division into a large welcome panel and an adjacent split login panel, not for its blue colors or alternate logo.

**Why:** The user asked for “بس الفكرة والتقسيم” while keeping the established theme.

**How to apply:** Preserve the green theme and real authentication; the reference's email/password fields do not authorize replacing authentication with a cosmetic form.

The user reiterated that the entire welcome page must switch between Arabic and English, not just the login section.

**Why:** They explicitly requested “الصفحة كاملة” after prior language changes.

**How to apply:** Apply the language to welcome content, all login states, feature descriptions, document direction and title.
