---
name: Daily import rule
description: Each account can save the same CSV content once a day while saving other files
---
The user chose: “نفس الملف مرة واحدة يوميًا، مع السماح بملفات مختلفة.”

**Why:** Repeated appearances in activity history led the user to request preventing duplicate file saves.

**How to apply:** Scope duplicate detection per account and Palestine calendar day (Asia/Hebron), by identical file bytes rather than filename. A renamed identical file counts as duplicate; a changed file does not. Keep prior history and notes; never delete historical duplicates silently. Activity events for edits are not new file copies.

The user clarified that repeated file cards in activity history are unacceptable: show a file once, with its notes and changes nested inside, including existing repeated imports when their saved source content matches.

**Why:** Preventing new duplicate imports alone did not address the visible repetition the user reported.

**How to apply:** Keep the daily import rule separate from history presentation. Preserve historical events and access to their original archives rather than deleting records to simplify the list.
