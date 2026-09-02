# Lab Reports API Endpoint Routing

Which endpoint does what, and where the current full specs live. Base URL `https://access.tryterra.co/api`; every request needs both `dev-id` and `x-api-key` headers.

For full request/response/error specs (query parameters, response bodies, RFC 7807 error shapes, status codes), fetch the live page: https://docs.tryterra.co/lab-reports/api-reference.md. The product is pre-release, so re-fetch before generating production request bodies.

| Goal                     | Endpoint                                      | Notes                                                                                                                                                                                                                                                                                                     |
| ------------------------ | --------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Upload a report          | `POST /v2/lab-reports`                        | Multipart; form field MUST be `file` (singular); one file per request; PDF/PNG/JPEG/GIF/WebP; 20 MB cap (400, sometimes 413, above); optional `reference_id` query param; `202` returns `{ upload_id, current_status: "processing" }` and a `Location` header pointing at `/v2/lab-reports?upload_id=...` |
| List / filter sessions   | `GET /v2/lab-reports`                         | Filter by `reference_id`, `upload_id`, `report_date_from`/`report_date_to`, `uploaded_at_from`/`uploaded_at_to` (dates are `YYYY-MM-DD`); capped at 500 results, use filters                                                                                                                              |
| Get a session            | `GET /v2/lab-reports/{session_id}`            | Session incl. `upload_id`, status history, layered `results[]`, `panels[]`; immutable and cacheable once terminal                                                                                                                                                                                         |
| Get the files            | `GET /v2/lab-reports/{session_id}/files`      | Input files + best-effort thumbnail, each `{ filename, presigned_url }`, plus one response-level `expires_at`                                                                                                                                                                                             |
| Get delivery state       | `GET /v2/lab-reports/{session_id}/deliveries` | Per-destination `{ destination_id, destination_type, status, attempt_count, last_error }`                                                                                                                                                                                                                 |
| Get processing artifacts | `GET /v2/lab-reports/{session_id}/artifacts`  | Privileged keys ONLY – standard keys receive `404`, not an empty list                                                                                                                                                                                                                                     |
| Reprocess                | `POST /v2/lab-reports/{session_id}/reprocess` | Re-runs the pipeline; async `202` returning `{ session_id, current_status }`; emits a NEW event (new `event_id`) with the SAME `session_id`                                                                                                                                                               |
| Delete                   | `DELETE /v2/lab-reports/{session_id}`         | Soft-delete, `204`; storage cleaned up async                                                                                                                                                                                                                                                              |

## Semantics the spec page treats lightly

- **Upload returns `upload_id`, not `session_id`** – one upload can fan out to several sessions (multi-report files), so the `202` hands back the upload correlation key. Learn session IDs from the webhook's `data.session_id` or from `GET /v2/lab-reports?upload_id=...`.
- **Files, artifacts, and delivery state are NOT embedded in the session response** – they carry expiring presigned URLs or separately changing state, so they live on the sub-resources above.
- **Presigned URLs expire** (roughly one hour out; see the response's `expires_at`). Re-mint by re-fetching the sub-resource; do not persist a URL past its `expires_at`.
- **Processing takes roughly 30 seconds to 3 minutes** per report; space bulk uploads accordingly.
- **Results become queryable at `standardized`**, before delivery completes – you do not need to wait for `sent`.
- **Failures arrive as `lab_report.failed` events** with a structured `{ code, message, retriable }` error; polling `current_status` for `failed` remains the fallback when you have no webhook destination.

---

Cross-check against the live [API Reference](https://docs.tryterra.co/lab-reports/api-reference) page for the full specs.
