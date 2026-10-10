---
name: Missing values in comparison charts
description: Recharts may retain a prior bar when the next metric is missing
---
Treat missing chart values as unknown, never zero or the previous metric's value.

**Why:** Switching from scrap rate to downtime left a visible previous bar for a null value during Recharts animation, despite the text correctly saying unknown.

**How to apply:** Avoid interpolating across different metrics containing nulls; verify the transition itself, not just initial rendering. Keep source-trace values available separately.
