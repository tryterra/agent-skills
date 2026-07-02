# Webhook Delivery Semantics

How Lab Reports webhooks are delivered and what the payload contains. For the full payload example and field-level shapes, fetch the live page when writing the parser: https://docs.tryterra.co/lab-reports/webhook-payload.md. The biomarker/enum values inside `results` are open (new values appear without a version bump), so never treat any bundled list as exhaustive.

## How Delivery Works

When a session finishes processing, Terra API delivers an **event** to your configured destinations via HTTP POST. Return a 2xx to acknowledge; non-2xx responses are retried. Lab reports are not webhook-only: any configured destination can receive them (cloud storage, queues, databases), opt-in per destination by adding `"lab_report"` to its `destination_event_types` – that single coarse type covers BOTH the completed and failed events.

## The Event Envelope

Every webhook is an envelope: event metadata wraps the resource under `data`:

```json
{
  "type": "lab_report.completed",
  "event_id": "evt_9f1c2d7a8b3e4f56",
  "occurred_at": "2026-03-28T14:23:45Z",
  "upload_id": "upl_4a2b8c1d",
  "data": { "session_id": "297405620317847552", "results_count": 42, "panels": [], "results": [] }
}
```

Key semantics:

- **`type` is the event to branch on:** `lab_report.completed` (success) or `lab_report.failed` (terminal failure). Handle unknown types gracefully – the vocabulary can grow.
- **`event_id` is the dedup key.** It is minted once per processing pass and persisted with the payload, so every redelivery of the same stored payload carries the SAME `event_id`. A reprocess (`POST /v2/lab-reports/{session_id}/reprocess`) is a NEW event with a new `event_id` and the same `session_id`. See rules/webhooks-dedupe-event-id.md.
- **`occurred_at`** is the RFC 3339 UTC instant the event occurred.
- **`upload_id`** correlates every event produced from one upload – a multi-report upload fans out to several events sharing it. It can be absent on sessions minted before the upload contract; treat it as optional.
- **`data` is the resource, and it is focused, NOT the full session** – no status history, byte counts, presigned files, or delivery state. Fetch those via `GET /v2/lab-reports/{session_id}` and its `/files` / `/deliveries` sub-resources.

## Completed Events

`data` for `lab_report.completed` carries `session_id` (a snowflake int64 serialized as a JSON string – keep it a string end to end), `reference_id`, report date/time/locale, `results_count`, report-level `panels[]` (`{id, name, key}`), layered `results[]`, and `report_notes`. Optional fields are omitted when empty.

Each result is the layered shape (`source` / `biomarker` / `measurement` / `interpretation` / `reference_ranges`), **identical to the GET response result** – one parser serves both – with one difference: the webhook's `source` also carries `collection_date`/`collection_time` (the GET response puts those on the session, which a webhook consumer does not separately fetch). `biomarker.key` is null when unmatched; keep the result anyway.

## Failed Events

`data` for `lab_report.failed` is `{ session_id, reference_id, error }` where `error` is:

```json
{ "code": "extraction_failed", "message": "...", "retriable": false }
```

- Codes: `file_unreadable`, `extraction_failed`, `standardization_failed`, `internal` (the catch-all for transient internal faults). Treat the vocabulary as open.
- `retriable: true` means the same input may succeed on a re-submission; `false` means the input must change first (e.g. an unreadable file).

## Headers and Idempotency

Webhook requests carry a `Terra-Reference` header with the `session_id` – useful for logging and correlation before parsing the body. Dedup on the body's `event_id`, not the header: the header stays the same across a reprocess while `event_id` correctly distinguishes it.

---

Cross-check against the live [Webhook Payload](https://docs.tryterra.co/lab-reports/webhook-payload) page for the complete example payloads.
