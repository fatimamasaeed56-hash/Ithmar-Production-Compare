---
name: Gemini model availability
description: Listing a Gemini model does not guarantee generation works for this project
---
Verify a model with an actual generation request rather than treating the model listing as proof of availability.

**Why:** During chat integration, a listed older Flash model returned 404 on generation, and the rolling alias returned 503; a current explicit Flash model generated successfully.

**How to apply:** When troubleshooting, inspect sanitized status codes and model names only, never credentials or full provider errors. Keep a tested explicit model rather than silently rotating models.
