# Lab Reports API Endpoint Routing

Which endpoint does what, and where the current full specs live. Base URL `https://access.tryterra.co/api`; every request needs both `dev-id` and `x-api-key` headers.

For full request/response/error specs (query parameters, response bodies, RFC 7807 error shapes, status codes), fetch the live page: https://docs.tryterra.co/lab-reports/api-reference.md. The product is pre-release AND the live page currently documents a *draft* contract (an `upload_id`, and `/files` / `/deliveries` / `/artifacts` sub-endpoints) that the shipped API does not implement. Where the page disagrees with the table below, trust the shipped behavior.

| Goal | Endpoint | Notes |
| ---- | -------- | ----- |
| Upload a report | `POST /v2/lab-reports` | Multipart; form field MUST be `file` (singular); one file per request; PDF/PNG/JPEG/GIF/WebP; 20 MB cap (400, sometimes 413, above); optional `reference_id` query param; `202` returns `{ session_id, current_status: "processing" }` |
| List / filter sessions | `GET /v2/lab-reports` | Filter by `reference_id`, `report_date_from`/`report_date_to`, `uploaded_at_from`/`uploaded_at_to` (dates are `YYYY-MM-DD`); capped at 500 results, use date filters |
| Get a session | `GET /v2/lab-reports/{session_id}` | Full session incl. status history and inline files; immutable and cacheable once terminal |
| Reprocess | `POST /v2/lab-reports/{session_id}/reprocess` | Re-runs the pipeline; async `202`; on success emits a new `lab_report` webhook with the SAME `session_id` |
| Delete | `DELETE /v2/lab-reports/{session_id}` | Soft-delete, `204`; storage cleaned up async |

There are NO `/files`, `/deliveries`, or `/artifacts` sub-endpoints.

## Files are inline in the session response

`GET /v2/lab-reports/{session_id}` returns files inline, not via sub-resources:

- `input_files[]` – each `{ filename, presigned_url, expires_at }`.
- `thumbnail` – `{ presigned_url, expires_at }` when a thumbnail was generated (best-effort).
- `artifacts[]` – processing artifacts, each `{ filename, presigned_url, expires_at }`. **Only included for privileged keys**; for standard keys the field is simply omitted (not a `404`).

Presigned URLs expire (roughly one hour out, see each `expires_at`). Re-mint by re-fetching the session; do not persist a URL past its `expires_at`.

## Semantics the spec page treats lightly

- **Upload returns `session_id`, not `upload_id`** – one file yields exactly one session; there is no separate upload handle and no `?upload_id=` filter.
- **Processing takes roughly 30 seconds to 3 minutes** per report; space bulk uploads accordingly.
- **Results become queryable at `standardized`**, before delivery completes – you do not need to wait for `sent`.
- **Failures surface via status, not a webhook** – poll `GET /v2/lab-reports/{session_id}` for `current_status: "failed"`.

---

Source: verified against the shipped Terra API behavior. Cross-check against [API Reference](https://docs.tryterra.co/lab-reports/api-reference).
