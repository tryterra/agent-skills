---
title: Deduplicate Deliveries on the terra-reference Header
impact: CRITICAL
impactDescription: prevents double-processing on retries
tags: webhooks, idempotency
---

## Deduplicate Deliveries on the terra-reference Header

**Impact: CRITICAL (prevents double-processing on retries)**

Every Terra API webhook delivery carries a `terra-reference` header that uniquely identifies it. Retries (after timeouts or your own 5xx responses) reuse the same reference. Insert it into an event log table under a unique constraint as the first write; if the insert conflicts, the delivery was already handled, so return 200 immediately without reprocessing. The same header is also returned when you request historical data with webhook delivery, letting you correlate the eventual webhook with your original request.

**Incorrect (no delivery-level dedup, relying on upserts alone):**

```typescript
app.post("/api/terra/webhook", async (c) => {
  const event = await verifyAndParse(c);
  await processEvent(event); // a retried delivery re-runs everything,
  return c.text("ok", 200);  // including side effects that are not idempotent
});
```

**Correct (unique insert, short-circuit on conflict):**

```typescript
const reference = c.req.header("terra-reference");
const inserted = await db.execute(
  `INSERT INTO terra_webhook_event (terra_reference, type, received_at)
   VALUES ($1, $2, now())
   ON CONFLICT (terra_reference) DO NOTHING
   RETURNING id`,
  [reference, event.type],
);
if (inserted.rows.length === 0) {
  return c.text("ok", 200); // already seen this delivery
}
c.executionCtx.waitUntil(processEvent(inserted.rows[0].id, event));
return c.text("ok", 200);
```

Reference: [Receiving data updates](https://docs.tryterra.co/health-and-fitness-api/managing-user-health-data/receiving-data-updates)
