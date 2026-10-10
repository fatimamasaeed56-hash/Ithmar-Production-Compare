---
name: Preview cookie policy
description: The preview proxy can rewrite SameSite cookies for iframe compatibility
---
Do not diagnose a server cookie bug solely from the preview browser reporting SameSite=None.

**Why:** A direct API registration response emitted HttpOnly, Secure, SameSite=Lax, while the same application's proxied preview login emitted HttpOnly, Secure, SameSite=None. The proxy, not the authentication handler, changed the attribute.

**How to apply:** Compare only redacted cookie attributes in direct and proxied responses; never print cookie values. Retain explicit Origin checks and JSON-only state-changing requests rather than relying on SameSite alone.
