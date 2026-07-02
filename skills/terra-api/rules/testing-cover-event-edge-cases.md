---
title: Cover the Event Edge Cases That Break in Production
impact: LOW-MEDIUM
tags: testing, coverage, webhooks
---

## Cover the Event Edge Cases That Break in Production

**Impact: LOW-MEDIUM**

The Terra API failure modes that reach production are rarely the happy path; they are the odd deliveries. Use this coverage checklist for the webhook pipeline:

- **Every event type**: all six data events, all six auth events, and the informational events (`healthcheck`, `processing`, `rate_limit_hit`, ...) each reach the right handler
- **Signature**: missing header rejected 401, invalid signature rejected 401, valid passes
- **Dedup replay**: the same `terra-reference` delivered twice processes once and still returns 200
- **Empty `data[]`**: a data event with no records completes without writes or errors
- **Missing `user_id`**: malformed payloads are logged and acknowledged, not crashed on
- **Unknown Terra user**: data for a user you have no connection row for (webhook raced ahead of auth, or a missed reauth swap)
- **Unknown event type**: logged and acknowledged (forward compatibility)
- **`type = 0` falsiness**: activity type `0` is a valid value; `if (item.type)` drops it
- **Enrichment-null regression**: a delivery with null scores does not erase stored scores (the COALESCE path)
- **Reauth ID swap**: after `user_reauth`, data for the new Terra user ID lands on the same connection

**Incorrect (happy-path-only suite):**

```typescript
it("stores a daily payload", async () => { ... }); // the only webhook test
```

**Correct (edge cases as first-class tests):**

```typescript
it("returns 200 without reprocessing a replayed terra-reference", ...);
it("acknowledges events with an empty data array", ...);
it("keeps stored scores when enrichment arrives null", ...);
it("maps activity type 0 correctly", ...);
it("swaps terra_user_id on user_reauth and keeps history", ...);
```

Reference: [Event types](https://docs.tryterra.co/reference/health-and-fitness-api/event-types)
