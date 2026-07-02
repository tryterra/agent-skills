# Lab Reports API Endpoint Routing

Which endpoint does what, and where the current full specs live. Base URL `https://access.tryterra.co/api`; every request needs both `dev-id` and `x-api-key` headers.

For full request/response/error specs (query parameters, response bodies, RFC 7807 error shapes, status codes), fetch the live page: https://docs.tryterra.co/lab-reports/api-reference.md – the product is pre-release, so field-level details there are authoritative and may change.

| Goal | Endpoint | Notes |
| ---- | -------- | ----- |
| Upload a report | `POST /v2/lab-reports` | Multipart; form field MUST be `file` (singular); one file per request; PDF/PNG/JPEG/GIF/WebP; 20 MB cap (413 above); optional `reference_id` query param; 202 returns `upload_id` |
| List / filter sessions | `GET /v2/lab-reports` | Filter by `reference_id`, `upload_id`, date ranges; capped at 500 results, use date filters |
| Get a session | `GET /v2/lab-reports/{session_id}` | Full session incl. status history; immutable and cacheable once terminal |
| Delivery state | `GET /v2/lab-reports/{session_id}/deliveries` | Per-destination outcomes (mutable) |
| Input files | `GET /v2/lab-reports/{session_id}/files` | Presigned URLs minted on demand; they expire, re-fetch to re-mint |
| Processing artifacts | `GET /v2/lab-reports/{session_id}/artifacts` | Privileged API keys only; standard keys get 404 |
| Reprocess | `POST /v2/lab-reports/{session_id}/reprocess` | Re-runs the pipeline; emits a NEW `event_id` |
| Delete | `DELETE /v2/lab-reports/{session_id}` | Soft-delete, 204; storage cleaned up async |

## Semantics the spec page treats lightly

- **Upload returns `upload_id`, not `session_id`** – one upload can produce multiple sessions; learn session IDs from webhooks or the list endpoint.
- **`GET ?upload_id=` is eventually consistent** right after the 202 – an immediate query can return an empty or partial list; webhooks are the reliable completion signal.
- **Processing takes roughly 30 seconds to 3 minutes** per report; space bulk uploads accordingly.
- **Results become queryable at `standardized`**, before delivery completes – you do not need to wait for `sent`.
