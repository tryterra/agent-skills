# Webhook Delivery Semantics

How Lab Reports events are delivered and what the envelope means. For the complete payload example, the failure schema, and every enum table, fetch the live page: https://docs.tryterra.co/lab-reports/webhook-payload.md – the enums are explicitly OPEN (new values appear without a version bump), so never treat a bundled copy as exhaustive.

## How Delivery Works

When a session completes, Terra API delivers an event to your configured destinations via HTTP POST. Return a 2xx to acknowledge; non-2xx responses are retried. Lab reports are not webhook-only: any configured destination can receive them (cloud storage, queues, databases), opt-in per destination by adding `"lab_report"` to its `destination_event_types`. Storage and document-database destinations receive the full report body; row and message destinations receive a time-limited link.

## Event Envelope

Event metadata wraps the report under `data`:

```json
{
  "type": "lab_report.completed",
  "event_id": "evt_9f1c...",
  "occurred_at": "2026-03-28T14:23:45Z",
  "upload_id": "upl_4a2b...",
  "data": { "session_id": "...", "results": [ ... ] }
}
```

Key semantics:

- **Branch on `type`**: `lab_report.completed` or `lab_report.failed`.
- **`event_id` is the idempotency key** – unique per event, stable across redeliveries; a reprocess emits a NEW `event_id` (see rules/webhooks-dedupe-event-id.md).
- **`upload_id` correlates** every event produced from the same upload (one upload can yield several reports).
- **`data` is a focused resource, NOT the full session** – no status history, byte counts, presigned files, or delivery state; fetch those via `GET /v2/lab-reports/{session_id}` and its sub-resources.
- **`Terra-Reference` header** carries the session ID on every webhook request – use it for logging and dedup before parsing the body.

## Failure Events

`lab_report.failed` carries an error object with a code. Retriability split:

| Error code | Retriable? |
| ---------- | ---------- |
| `file_unreadable` | No – needs a clearer file |
| `extraction_failed` | Yes |
| `standardization_failed` | Yes |
| `internal` | Yes |

For the exact failure payload shape and any additional codes, fetch the live page above.
