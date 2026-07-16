---
title: Archive Raw Payloads, Link Them From Extracted Rows
impact: CRITICAL
impactDescription: preserves full data for debugging and future features
tags: webhooks, storage, observability
---

## Archive Raw Payloads, Link Them From Extracted Rows

**Impact: CRITICAL (preserves full data for debugging and future features)**

Terra API payloads are large and deeply nested; you will only extract a subset into your database. Archive the raw JSON of every delivery to object storage (S3, R2, GCS) under a date-partitioned key, and store that key in a `payload_key` column on each extracted data row. This gives you replayability when a bug is found in extraction, an audit trail for debugging provider quirks, and access to fields you did not extract yet, without re-requesting data from Terra API. Update `payload_key` on every upsert so it always points at the most recent delivery for that row.

**Incorrect (extract and discard):**

```typescript
async function processEvent(event: TerraWebhookEvent) {
  await upsertDailyRows(event.data); // raw payload is gone forever;
  // an extraction bug now means asking Terra API to backfill everything
}
```

**Correct (archive first, link each row):**

```typescript
async function processEvent(
  eventId: string,
  event: TerraWebhookEvent,
  raw: string,
) {
  const payloadKey = `webhooks/${yyyy}/${mm}/${dd}/${eventId}.json`;
  await bucket.put(payloadKey, raw);
  await upsertDailyRows(event.data, payloadKey); // each row stores payload_key
}
```

Reference: [Webhooks](https://docs.tryterra.co/health-and-fitness-api/integration-setup/setting-up-data-destinations/webhooks)
