---
title: Deduplicate Deliveries on X-Terra-Trace-Id, Not terra-reference
impact: CRITICAL
impactDescription: deduping on terra-reference silently drops large-request chunks
tags: webhooks, idempotency
---

## Deduplicate Deliveries on X-Terra-Trace-Id, Not terra-reference

**Impact: CRITICAL (deduping on terra-reference silently drops large-request chunks)**

Two headers look like dedup keys, and only one is. `X-Terra-Trace-Id` uniquely identifies a delivery and is stable across retries (retries fire on timeouts and on ANY response of 400 or above, not just 5xx). `Terra-reference` correlates deliveries back to the originating request: it matches the `reference` field in the API response that triggered the data, and a large historical request stamps the SAME reference on its `large_request_processing` event, its `large_request_sending` event, and EVERY data chunk (chunks get distinct trace ids of the form `<id>:chunk:<n>`). Deduplicating on `terra-reference` with an insert-or-ignore therefore treats every chunk after the first as a replay and drops it while returning 200. Insert `X-Terra-Trace-Id` into an event log table under a unique constraint as the first write; on conflict, the delivery was already handled, so return 200 without reprocessing. Store `terra-reference` alongside it as a correlation column so you can tie webhooks to the historical requests you issued.

**Incorrect (deduping on terra-reference drops chunks of large requests):**

```typescript
const reference = c.req.header("terra-reference"); // shared by ALL chunks
await db.execute(
  `INSERT INTO terra_webhook_event (terra_reference, type, received_at)
   VALUES ($1, $2, now())
   ON CONFLICT (terra_reference) DO NOTHING`, // chunks 2..n conflict
  [reference, event.type],
); // ...and get silently discarded with a 200
```

**Correct (unique insert on X-Terra-Trace-Id, terra-reference kept for correlation):**

```typescript
const traceId = c.req.header("x-terra-trace-id");   // unique per delivery
const reference = c.req.header("terra-reference");  // ties back to your request
const inserted = await db.execute(
  `INSERT INTO terra_webhook_event (trace_id, terra_reference, type, received_at)
   VALUES ($1, $2, $3, now())
   ON CONFLICT (trace_id) DO NOTHING
   RETURNING id`,
  [traceId, reference, event.type],
);
if (inserted.rows.length === 0) {
  return c.text("ok", 200); // a retry of a delivery we already handled
}
c.executionCtx.waitUntil(processEvent(inserted.rows[0].id, event));
return c.text("ok", 200);
```

Reference: [Receiving data updates](https://docs.tryterra.co/health-and-fitness-api/managing-user-health-data/receiving-data-updates)
