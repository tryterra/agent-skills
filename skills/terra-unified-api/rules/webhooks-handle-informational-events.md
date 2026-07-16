---
title: Handle Non-Data Events Explicitly
impact: CRITICAL
impactDescription: unknown-event crashes drop real data deliveries
tags: webhooks, event-types
---

## Handle Non-Data Events Explicitly

**Impact: CRITICAL (unknown-event crashes drop real data deliveries)**

Not every webhook carries health data. Terra API also sends operational events: `large_request_processing` and `large_request_sending` (a large historical request is being prepared and sent). Log these, return 200, and do not route them through your data pipeline. A handler that throws on unexpected event types turns every such event into a 5xx, which triggers retries and can mask real failures. Treat unknown event types the same way: log and acknowledge, so new event types never break your endpoint.

One event type wraps real data rather than carrying it inline: `s3_payload`. When your destination uses ping-mode delivery, the payload is uploaded to cloud storage and the webhook body contains a download URL instead of the data. Fetch the URL to obtain the actual payload, then process it through the normal data path.

One data event has a different shape: `athlete` payloads carry a single `athlete` object, not a `data` array, so a generic `event.data.map(...)` path throws on them. Branch on the type before assuming an array.

**Incorrect (assuming every event carries data):**

```typescript
async function processEvent(event: TerraWebhookEvent) {
  const rows = event.data.map(extractMetrics); // throws on large_request_processing:
  await upsertRows(rows); // event.data is undefined
}
```

**Correct (explicit taxonomy with a safe default):**

```typescript
const DATA_EVENTS = [
  "activity",
  "athlete",
  "body",
  "daily",
  "hormone",
  "menstruation",
  "nutrition",
  "sleep",
  "planned_workout",
  "lab_report",
  "route",
];
const AUTH_EVENTS = [
  "auth",
  "auth_cancelled",
  "deauth",
  "user_reauth",
  "access_revoked",
  "permission_change",
  "connection_error",
];

async function processEvent(event: TerraWebhookEvent) {
  if (event.type === "s3_payload") {
    const payload = await fetch(event.url).then((r) => r.json()); // ping-mode wrapper
    return processEvent(payload);
  }
  if (event.type === "athlete") return handleAthlete(event.athlete); // object, no data[]
  if (DATA_EVENTS.includes(event.type)) return handleDataEvent(event);
  if (AUTH_EVENTS.includes(event.type)) return handleAuthEvent(event);
  // large_request_processing, large_request_sending, and anything new:
  // log and move on
  console.log(`terra operational event: ${event.type}`);
}
```

Reference: [Event types](https://docs.tryterra.co/reference/health-and-fitness-api/event-types)
