---
title: Deduplicate Webhook Deliveries on event_id
impact: HIGH
impactDescription: redeliveries reprocess the same report twice
tags: webhooks, idempotency, delivery
---

## Deduplicate Webhook Deliveries on event_id

**Impact: HIGH (redeliveries reprocess the same report twice)**

Every lab report webhook is an event envelope carrying a unique `event_id`. If your endpoint returns a non-2xx status, Terra API retries delivery, so the same event can arrive more than once. Deduplicate on `event_id` with a persisted key: it is stable across redeliveries of the same event, so it is the correct idempotency key. Do not dedupe on `session_id` alone – reprocessing a session (`POST /v2/lab-reports/{session_id}/reprocess`) emits a NEW event with a NEW `event_id` for the same `session_id`. That is an intentional, distinct event, not a duplicate, and dropping it would silently ignore the reprocessed result.

**Incorrect (deduping on session_id, so a reprocess is discarded):**

```typescript
async function handleLabReport(event) {
  const sessionId = event.data.session_id;
  if (await seenSession(sessionId)) return; // drops the reprocessed event
  await process(event.data);
  await markSessionSeen(sessionId);
}
```

**Correct (dedupe on event_id, which is unique per event):**

```typescript
async function handleLabReport(event) {
  const eventId = event.event_id; // stable across redeliveries, new on reprocess
  if (await alreadyProcessed(eventId)) return; // acknowledge, skip
  await process(event.data);
  await markProcessed(eventId);
}
```

Branch on the envelope `type` (`lab_report.completed` vs `lab_report.failed`) inside the handler, after the dedup check.

Reference: [Best Practices – Idempotency via Event ID](https://docs.tryterra.co/lab-reports/best-practices)
