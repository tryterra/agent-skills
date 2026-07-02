---
title: Handle Informational Events Explicitly
impact: CRITICAL
impactDescription: unknown-event crashes drop real data deliveries
tags: webhooks, event-types
---

## Handle Informational Events Explicitly

**Impact: CRITICAL (unknown-event crashes drop real data deliveries)**

Not every webhook carries health data. Terra API also sends informational and status events: `healthcheck`, `processing` (an async fetch is in progress), `large_request_processing` and `large_request_sending` (a more-than-one-month historical request is being prepared and sent), `rate_limit_hit`, and `google_no_datasource`. Log these, return 200, and do not route them through your data pipeline. A handler that throws on unexpected event types turns every informational event into a 5xx, which triggers retries and can mask real failures. Treat unknown event types the same way: log and acknowledge.

**Incorrect (assuming every event carries data):**

```typescript
async function processEvent(event: TerraWebhookEvent) {
  const rows = event.data.map(extractMetrics); // throws on healthcheck:
  await upsertRows(rows);                      // event.data is undefined
}
```

**Correct (explicit taxonomy with a safe default):**

```typescript
const DATA_EVENTS = ["activity", "sleep", "body", "daily", "nutrition", "menstruation"];
const AUTH_EVENTS = ["auth", "deauth", "access_revoked", "user_reauth", "connection_error", "permission_change"];

async function processEvent(event: TerraWebhookEvent) {
  if (DATA_EVENTS.includes(event.type)) return handleDataEvent(event);
  if (AUTH_EVENTS.includes(event.type)) return handleAuthEvent(event);
  // healthcheck, processing, large_request_*, rate_limit_hit,
  // google_no_datasource, and anything new: log and move on
  console.log(`terra informational event: ${event.type}`);
}
```

Reference: [Event types](https://docs.tryterra.co/reference/health-and-fitness-api/event-types)
