---
title: Deduplicate Webhook Deliveries on event_id
impact: HIGH
impactDescription: naive dedup either reprocesses a report twice or drops a reprocess
tags: webhooks, idempotency, delivery
---

## Deduplicate Webhook Deliveries on event_id

**Impact: HIGH (naive dedup either reprocesses a report twice or silently drops a reprocess)**

Every lab report webhook envelope carries an `event_id` minted once per processing pass and persisted with the payload: if your endpoint returns a non-2xx status and Terra API redelivers, every redelivery of that stored payload carries the SAME `event_id`. A reprocess (`POST /v2/lab-reports/{session_id}/reprocess`) is a NEW event with a new `event_id` and the SAME `session_id`.

So `event_id` is the idempotency key – not `session_id` (which stays constant across a reprocess, so deduping on it drops the reprocessed result) and not the `Terra-Reference` header (which carries the session ID). Branch on the envelope `type` first: `lab_report.completed` and `lab_report.failed` are distinct events that both arrive on the same coarse `"lab_report"` destination opt-in.

**Incorrect (deduping on session_id, so a reprocess is discarded):**

```typescript
async function handleLabReport(envelope, headers) {
  const sessionId = envelope.data.session_id; // == headers["terra-reference"]
  if (await seenSession(sessionId)) return; // drops the reprocessed webhook
  await process(envelope.data);
  await markSessionSeen(sessionId);
}
```

**Correct (dedupe on event_id, branch on type):**

```typescript
async function handleLabReport(envelope) {
  if (await alreadyProcessed(envelope.event_id)) return; // acknowledge, skip redelivery
  switch (envelope.type) {
    case "lab_report.completed":
      await storeResults(envelope.data); // data.session_id, data.results, data.panels
      break;
    case "lab_report.failed":
      await recordFailure(envelope.data.session_id, envelope.data.error); // {code, message, retriable}
      break;
    default:
      // open vocabulary: log and acknowledge unknown event types
  }
  await markProcessed(envelope.event_id); // a reprocess has a new event_id -> accepted
}
```

Use `upload_id` (when present) to correlate the several events one upload can fan out to; it is not a dedup key.

Reference: [Webhook Payload](https://docs.tryterra.co/lab-reports/webhook-payload)
