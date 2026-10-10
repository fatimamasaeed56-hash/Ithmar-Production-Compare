---
name: ETHMAR production scope
description: User-defined evidence and read-only constraints for production comparison
---

ERP means the factory's existing business-management system. CSV is a spreadsheet-like export. This prototype is a read-only view of factory-approved exports and cannot change the original system.

**Why:** The user explicitly defined the system terminology and wants missing or duplicate source data shown as “مشكلات في البيانات” with a visible error message.

**How to apply:** Explain these terms in the internal tool, not the previously simplified welcome page. Retain problematic rows for tracing; never claim the app independently certifies an imported file. Only report an absent expected run where its expected identity is actually known.
The user wants a read-only tool for the ETHMAR PLASTICS production manager to compare E-01 and E-02 using only user-supplied records, ultimately approved CSV exports. Every value must be traceable to its original source row. The additional E-02 unplanned stoppage is a separate record, not mold-change time.

**Why:** The user explicitly limited the tool to their supplied data and required source-row traceability.

**How to apply:** Do not invent production data or certify imported exports as approved. Distinguish values supplied in chat from actual imported file evidence; absence of a stoppage record is unknown, not zero.

The user explicitly authorized persistent per-account saving of imported CSV files, notes, and activity on 2026-10-10, superseding the earlier browser-memory-only/no-upload rule. They said each person who creates an account must have their own files and activity. Parse CSV in the browser, but save originals privately in App Storage and records/notes/history in the account database. Never expose another user's records or download links without ownership checks. No ERP connection or writes. The user subsequently explicitly requested Arabic Gemini chat, superseding the no-AI rule for the chat only; do not automatically send production files or account records to Gemini. Real login is required. Use React, Vite, and TypeScript. Never silently remove incomplete or duplicate rows; warn and retain reviewability. Do not invent order, machine, mold, shift, or ERP identifiers; any demo identifiers must explicitly say DEMO.

**Why:** The user explicitly confirmed upload/storage consent after being told it replaces the prior local-only behavior: “كل شخص يدخل للموقع ويعمل حساب يحفظ نشاطه وملفاته على حسابه”.

Every authenticated sign-in must ask the user to enter or confirm their first and second names, including existing accounts. Refreshing the same confirmed session should not repeatedly interrupt them. Keep saved user-entered names rather than replacing them with identity-provider display names.

**Why:** The user requested name collection “حتى لو كان عنده حساب فعلي على الويبسايت” and access for other accounts without weakening real authentication or merging their data.

**How to apply:** Scope the confirmation to a login session; use identity-provider subject IDs, not entered names, for account ownership. Authorization flow cookies must be isolated per attempt so repeated clicks or tabs cannot overwrite each other's PKCE verifier.

**How to apply:** Show E-02 minus E-01 for the requested scrap-rate and mold-change summaries: +5 percentage points and +2 hours for the supplied records. Keep the 45-minute unplanned stop separate and make no causal inference.

The CSV intake must use PapaParse with header:true and skipEmptyLines:'greedy'. Entirely empty lines, including the trailing newline, are not incomplete data records. Missing values within data rows remain visible with warnings. Recognized run_id, event_id, record_type headers and an error-free parse trigger direct import; alternate headers trigger automatic navigation to column mapping. The same file can be chosen again.

**Why:** The user explicitly specified this import contract and distinguished blank lines from incomplete records.

**How to apply:** Preserve original physical row positions and raw values; do not treat skipped blank lines as records or renumber source rows after skipping them.

The user wants a separate welcome page combining company goals and real login on the same page. They supplied goals about a strong production base, local plastic-packaging services, quality and prices, customer product selection, and training with advanced CNC equipment.

**Why:** These are company-provided aspirations, not independently verified certifications or performance figures.

**How to apply:** Keep the green uploaded brand identity and integrated transparent logo. Do not invent certifications, statistics, or expand the ambiguous CNC wording into detailed service promises.

Place a clear company logo at the top of every page, not as a large background watermark.

**Why:** The user explicitly chose “شعار واضح أعلى كل صفحة” over a full-interface background.

**How to apply:** Preserve the transparent logo and its visible top placement in both public and signed-in interfaces, including mobile layouts.

The user explicitly reversed the earlier choice of separate demo access: they now want real login only, no demo access.

**Why:** The user said “مابدي دخول تجريبي بدي دخول حقيقي”.

**How to apply:** Do not reintroduce any-email demo entry or authentication bypass. Keep the language switch; the company-goals statement at the bottom must follow the selected language too.

Use the user's supplied welcome/login reference for its division into a large welcome panel and an adjacent split login panel, not for its blue colors or alternate logo.

**Why:** The user asked for “بس الفكرة والتقسيم” while keeping the established theme.

**How to apply:** Preserve green Ithmar branding and real provider authentication; the reference's email/password fields do not authorize replacing authentication with a cosmetic form.

The user reiterated that the entire welcome page must switch between Arabic and English, not just the login section.

**Why:** They explicitly requested “الصفحة كاملة” after prior language changes.

**How to apply:** Apply the language to welcome content, all login states, goals, document direction and title. Keep the supplied bilingual logo unchanged.
