---
title: Acknowledge Within the Timeout, Process Async
impact: CRITICAL
impactDescription: slow handlers cause retries and duplicate deliveries
tags: webhooks, performance, reliability
---

## Acknowledge Within the Timeout, Process Async

**Impact: CRITICAL (slow handlers cause retries and duplicate deliveries)**

Terra API expects a 200 response within the webhook timeout: 8 seconds by default, configurable per destination but clamped to 1-30 seconds. If your handler does archival, database writes, and downstream processing before responding, large payloads or a slow database push you past the timeout, Terra API treats the delivery as failed, and you receive retries for events you actually processed. Do the minimum inline (verify signature, record the event for deduplication), return 200, and run the heavy work asynchronously in a background task or queue.

**Incorrect (processing everything before responding):**

```typescript
app.post("/api/terra/webhook", async (c) => {
  const event = await verifyAndParse(c);
  await archiveRawPayload(event); // object storage write
  await upsertHealthData(event); // database writes for every record
  await updateConnectionStatus(event); // more writes
  return c.text("ok", 200); // may arrive after the timeout (8s default)
});
```

**Correct (ack fast, process in the background):**

```typescript
app.post("/api/terra/webhook", async (c) => {
  const event = await verifyAndParse(c);
  const eventId = await recordEvent(event); // dedup insert, cheap
  // background task, queue message, or platform equivalent (e.g. waitUntil)
  c.executionCtx.waitUntil(processEvent(eventId, event));
  return c.text("ok", 200); // responds in milliseconds
});
```

Mark the recorded event `processed` or `failed` when the background work finishes so failures are visible and replayable.

Reference: [Webhooks](https://docs.tryterra.co/health-and-fitness-api/integration-setup/setting-up-data-destinations/webhooks)
