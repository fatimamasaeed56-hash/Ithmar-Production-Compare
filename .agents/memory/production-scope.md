---
name: ETHMAR production scope
description: User-defined evidence and read-only constraints for production comparison
---
The user wants a read-only tool for the ETHMAR PLASTICS production manager to compare E-01 and E-02 using only user-supplied records, ultimately approved CSV exports. Every value must be traceable to its original source row. The additional E-02 unplanned stoppage is a separate record, not mold-change time.

**Why:** The user explicitly limited the tool to their supplied data and required source-row traceability.

**How to apply:** Do not invent production data or certify imported exports as approved. Distinguish values supplied in chat from actual imported file evidence; absence of a stoppage record is unknown, not zero.

CSV processing must stay in browser memory only: no upload or persistent saving, ERP connection or writes, login, database, or AI API. Use React, Vite, and TypeScript. Never silently remove incomplete or duplicate rows; warn and retain reviewability. Do not invent order, machine, mold, shift, or ERP identifiers; any demo identifiers must explicitly say DEMO.

**Why:** The user explicitly requires this scope for this version.

**How to apply:** Show E-02 minus E-01 for the requested scrap-rate and mold-change summaries: +5 percentage points and +2 hours for the supplied records. Keep the 45-minute unplanned stop separate and make no causal inference.
