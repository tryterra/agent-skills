---
title: Deduplicate Webhook Deliveries on session_id Plus Content
impact: HIGH
impactDescription: naive dedup either reprocesses a report twice or drops a reprocess
tags: webhooks, idempotency, delivery
---

## Deduplicate Webhook Deliveries on session_id Plus Content

**Impact: HIGH (naive dedup either reprocesses a report twice or silently drops a reprocess)**

Lab report webhooks carry NO `event_id`. The payload is flat (`type: "lab_report"`, `session_id`, `results`, ...), and the dispatcher sets both the `Terra-reference` and `X-Terra-Trace-Id` headers to the `session_id`. If your endpoint returns a non-2xx status, Terra API retries delivery, so the same webhook can arrive more than once – and a reprocess (`POST /v2/lab-reports/{session_id}/reprocess`) emits a NEW webhook with the SAME `session_id` and the SAME headers.

So `session_id` alone is ambiguous: dedup on it and you drop the reprocessed result; dedup on nothing and a retry reprocesses the report twice. Key idempotency on `session_id` PLUS a content discriminator – a hash of the payload, or a field like `results_count` – so a redelivery of the same content is skipped while a reprocess (different content) is accepted.

**Incorrect (deduping on session_id alone, so a reprocess is discarded):**

```typescript
async function handleLabReport(payload, headers) {
  const sessionId = payload.session_id; // == headers["terra-reference"]
  if (await seenSession(sessionId)) return; // drops the reprocessed webhook
  await process(payload);
  await markSessionSeen(sessionId);
}
```

**Correct (dedupe on session_id + content hash):**

```typescript
import { createHash } from "crypto";

async function handleLabReport(rawBody, payload) {
  const sessionId = payload.session_id;
  const contentHash = createHash("sha256").update(rawBody).digest("hex");
  const key = `${sessionId}:${contentHash}`;
  if (await alreadyProcessed(key)) return; // acknowledge, skip true duplicate
  await process(payload);
  await markProcessed(key); // a later reprocess hashes differently -> accepted
}
```

There is no `type` suffix to branch on (`type` is always `"lab_report"`), and failures never arrive as webhooks – detect those by polling the session for a `failed` status.

Reference: [Best Practices](https://docs.tryterra.co/lab-reports/best-practices) (note: the live docs describe a draft `event_id` envelope the shipped API does not send).
