# Webhook Delivery Semantics

How Lab Reports webhooks are delivered and what the payload contains. The live page (https://docs.tryterra.co/lab-reports/webhook-payload.md) currently documents a *draft* contract – an event envelope with `type: "lab_report.completed"`, `event_id`, `occurred_at`, `upload_id`, and a `data` wrapper. The **shipped** service does not send that shape. This file describes what the backend actually emits; where the two differ, trust the shipped shape below. The biomarker/enum values inside `results` are still open (new values appear without a version bump), so never treat any bundled list as exhaustive.

## How Delivery Works

When a session finishes standardizing successfully, Terra API delivers a webhook to your configured destinations via HTTP POST. Return a 2xx to acknowledge; non-2xx responses are retried. Lab reports are not webhook-only: any configured destination can receive them (cloud storage, queues, databases), opt-in per destination by adding `"lab_report"` to its `destination_event_types`.

**Webhooks fire only on success.** On permanent failure the pipeline transitions the session to `failed` and emits NO webhook (see "Failures" below).

## Payload Shape

The payload is a **flat object** – there is no envelope and no `data` wrapper:

```json
{
  "type": "lab_report",
  "session_id": "297405620317847552",
  "reference_id": "patient-123",
  "report_date": "2026-03-28",
  "report_time": "09:15",
  "report_locale": "en-US",
  "results_count": 42,
  "results": [ /* standardized results */ ],
  "report_notes": ""
}
```

Key semantics:

- **`type` is always `"lab_report"`** – there is no `.completed` / `.failed` suffix to branch on.
- **`session_id` is the identity** – a snowflake int64 serialized as a JSON string. Keep it a string end to end.
- **`results` are the standardized results**, the same shape as in the GET-session response. Optional fields such as `biomarker_key` and `loinc_code` are OMITTED when unmatched, not present-but-null.
- **The payload is focused, NOT the full session** – no status history, byte counts, presigned files, or delivery state. Fetch those via `GET /v2/lab-reports/{session_id}`.
- **`reference_id`, `report_date`, `report_time`, `report_locale`, `report_notes` are omitted when empty.** Only `type`, `session_id`, `results_count`, and `results` are always present.

## Headers and Idempotency

The dispatcher sets both **`Terra-reference`** and **`X-Terra-Trace-Id`** to the `session_id` on every webhook request. Use them for logging and dedup before parsing the body.

There is no `event_id`. A reprocess (`POST /v2/lab-reports/{session_id}/reprocess`) emits a NEW webhook with the SAME `session_id` and the SAME headers – so `session_id` alone cannot distinguish a redelivery from an intentional reprocess. Key idempotency on `session_id` PLUS content (e.g. `results_count` or a hash of the payload). See rules/webhooks-dedupe-session-id.md.

## Failures

There is no failure webhook and no error-code taxonomy. When processing fails permanently the session is moved to `current_status: "failed"`; a freeform `report_notes` (for example "fetch files failed", "extraction failed", "standardization failed") may be present. Detect failures by polling `GET /v2/lab-reports/{session_id}` for a `failed` status – see rules/api-poll-at-most-every-5s.md.

---

Source: verified against the shipped Terra API behavior. Cross-check against [Webhook Payload](https://docs.tryterra.co/lab-reports/webhook-payload).
