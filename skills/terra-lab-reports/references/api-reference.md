# Lab Reports API Reference

Full endpoint specifications for the Terra Lab Reports API (pre-release).

**Base URL:** `https://access.tryterra.co/api`

All endpoints require both authentication headers:

| Header      | Required | Description             |
| ----------- | -------- | ----------------------- |
| `dev-id`    | Yes      | Your Terra API developer ID |
| `x-api-key` | Yes      | Your Terra API key      |

Endpoint summary:

| Method | Endpoint                                    | Description                          |
| ------ | ------------------------------------------- | ------------------------------------ |
| POST   | `/v2/lab-reports`                           | Upload a lab report                  |
| GET    | `/v2/lab-reports`                           | List / filter sessions (capped 500)  |
| GET    | `/v2/lab-reports/{session_id}`              | Retrieve session (immutable, cacheable) |
| GET    | `/v2/lab-reports/{session_id}/deliveries`   | Per-destination delivery state       |
| GET    | `/v2/lab-reports/{session_id}/files`        | Input files + thumbnail (presigned)  |
| GET    | `/v2/lab-reports/{session_id}/artifacts`    | Processing artifacts (privileged only) |
| POST   | `/v2/lab-reports/{session_id}/reprocess`    | Re-run extraction/standardization    |
| DELETE | `/v2/lab-reports/{session_id}`              | Soft-delete a session                |

---

## Upload a Lab Report

`POST /v2/lab-reports`

Upload a single lab report file as multipart form data. Accepted formats: PDF, PNG, JPEG, GIF, WebP. Max 20 MB.

**Headers:** `dev-id`, `x-api-key`, `Content-Type: multipart/form-data`

**Query parameters:**

| Name           | Type   | Required | Description                                       |
| -------------- | ------ | -------- | ------------------------------------------------- |
| `reference_id` | string | No       | Your external identifier for this report/patient  |

**Request body (multipart):**

| Field  | Type | Required | Description                                            |
| ------ | ---- | -------- | ----------------------------------------------------- |
| `file` | file | Yes      | File to upload (PDF, PNG, JPEG, GIF, WebP; max 20 MB)  |

The form field name MUST be `file` (singular). Only a single file per request is supported today; multi-file support is planned.

```bash
curl -X POST "https://access.tryterra.co/api/v2/lab-reports?reference_id=patient_456" \
  -H "dev-id: YOUR_DEV_ID" \
  -H "x-api-key: YOUR_API_KEY" \
  -F "file=@/path/to/report.pdf"
```

**Response – 202 Accepted:**

```json
{
  "upload_id": "upl_4a2b8c1d",
  "current_status": "processing"
}
```

The upload returns an `upload_id`, NOT a `session_id`. A single upload can produce more than one report (e.g. a multi-report PDF), so the session id(s) are not known at upload time. Learn the `session_id`(s) from the webhook events, or list them with `GET /v2/lab-reports?upload_id=upl_4a2b8c1d`. Every resulting session and webhook event carries the same `upload_id`. The list is eventually consistent: right after the `202` the sessions may not all exist yet, so a `GET ?upload_id=` can return an empty or partial list. Webhook events are the reliable signal that a report finished.

**Error responses:**

| Code | Description                               |
| ---- | ----------------------------------------- |
| 400  | Missing file or unsupported format        |
| 401  | Invalid or missing `dev-id` / `x-api-key` |
| 413  | File exceeds 20 MB                        |
| 429  | Rate limit exceeded                       |
| 500  | Internal server error                     |

Errors use [RFC 7807](https://www.rfc-editor.org/rfc/rfc7807) Problem JSON:

```json
{
  "type": "about:blank",
  "title": "bad request",
  "detail": "missing file field",
  "instance": "/v2/lab-reports"
}
```

---

## List Sessions

`GET /v2/lab-reports`

List sessions for your account, with optional filters. Results are capped at 500 per request – use date filters to narrow results for accounts with many sessions.

**Query parameters:**

| Name               | Type   | Required | Description                                              |
| ------------------ | ------ | -------- | -------------------------------------------------------- |
| `reference_id`     | string | No       | Filter by your external reference ID                     |
| `upload_id`        | string | No       | Return every report from that upload                     |
| `report_date_from` | string | No       | Lab report date lower bound (`YYYY-MM-DD`, inclusive)    |
| `report_date_to`   | string | No       | Lab report date upper bound (`YYYY-MM-DD`, inclusive)    |
| `uploaded_at_from` | string | No       | Upload date lower bound (`YYYY-MM-DD`, inclusive)        |
| `uploaded_at_to`   | string | No       | Upload date upper bound (`YYYY-MM-DD`, inclusive)        |

All date filters are inclusive and combinable.

**Response – 200 OK:**

```json
{
  "sessions": [
    {
      "session_id": "297405620317847552",
      "upload_id": "upl_4a2b8c1d",
      "reference_id": "patient_456",
      "report_type": "lab",
      "current_status": "sent",
      "report_date": "2026-03-15",
      "uploaded_at": "2026-03-28T14:22:10Z",
      "updated_at": "2026-03-28T14:23:45Z"
    }
  ]
}
```

---

## Retrieve a Session

`GET /v2/lab-reports/{session_id}`

Retrieve the report: metadata, results, reference ranges, and status history. This response is immutable and cacheable – it does NOT include presigned file URLs (which expire) or per-destination delivery state (which changes). Fetch those from the sub-resources.

**Path parameters:** `session_id` (string, the session's snowflake ID).

The session object is returned directly at the top level. See the SKILL.md data model and [Core Concepts](https://docs.tryterra.co/lab-reports/core-concepts) for full field specs. Key fields: `session_id`, `upload_id`, `reference_id`, `current_status`, `report_type`, `report_date`, `report_time`, `collection_date`, `collection_time`, `uploaded_at`, `updated_at`, `report_locale`, `lab_name`, `patient_sex`, `patient_age_at_collection`, `report_notes`, `status_history[]`, `results_count`, `file_count`, `input_bytes`, `output_bytes`, `results[]`.

`client_id` is intentionally omitted from responses (the API authenticates by client identity). See [Quick Start](https://docs.tryterra.co/lab-reports/quickstart) for a complete example response.

**Error responses:** 401 (auth), 404 (not found), 500 (internal).

---

## List Deliveries

`GET /v2/lab-reports/{session_id}/deliveries`

Per-destination delivery state. A report is fanned out to every destination that opted in to lab reports, each tracked independently – which is why a session can be `partially_sent`. Delivery state is mutable (`pending` → `delivered`/`failed`/`retrying`), so it lives here rather than on the cacheable session.

**Response – 200 OK:**

```json
{
  "deliveries": [
    { "destination_id": "12", "destination_type": "webhook", "status": "delivered", "attempt_count": 0 },
    { "destination_id": "15", "destination_type": "s3", "status": "failed", "attempt_count": 3, "last_error": "access denied" }
  ]
}
```

| Field              | Type    | Description                                              |
| ------------------ | ------- | ------------------------------------------------------- |
| `destination_id`   | string  | The destination's ID                                    |
| `destination_type` | string  | The destination's type (e.g. `webhook`, `s3`)           |
| `status`           | string  | `pending`, `delivered`, or `failed`                     |
| `attempt_count`    | integer | Retry count – `0` on the first attempt                  |
| `last_error`       | string? | Most recent delivery error (omitted when delivered)     |

---

## List Files

`GET /v2/lab-reports/{session_id}/files`

The uploaded input files and the report thumbnail, with freshly minted presigned download URLs. URLs are issued on demand because they EXPIRE – they are not embedded in the cacheable session or the webhook.

**Response – 200 OK:**

```json
{
  "files": [
    { "filename": "report.pdf", "presigned_url": "https://storage.googleapis.com/...signed-url..." }
  ],
  "thumbnail": { "filename": "thumbnail.png", "presigned_url": "https://storage.googleapis.com/...signed-thumbnail-url..." },
  "expires_at": "2026-03-28T15:22:10Z"
}
```

`expires_at` applies to every URL in the response. Fetch the endpoint again to mint fresh URLs.

---

## List Artifacts

`GET /v2/lab-reports/{session_id}/artifacts`

Intermediate processing artifacts, with freshly minted presigned URLs. Privileged keys only – standard keys receive a `404`. Same response shape as `/files` (an `artifacts[]` array plus `expires_at`).

---

## Reprocess a Session

`POST /v2/lab-reports/{session_id}/reprocess`

Re-run extraction and standardization on an existing session. Useful if a session failed or to pick up pipeline improvements.

**Path parameters:** `session_id` (string).

```bash
curl -X POST "https://access.tryterra.co/api/v2/lab-reports/297405620317847552/reprocess" \
  -H "dev-id: YOUR_DEV_ID" \
  -H "x-api-key: YOUR_API_KEY"
```

**Response – 202 Accepted:**

```json
{
  "session_id": "297405620317847552",
  "current_status": "processing"
}
```

Includes a `Location` header pointing to the session. The session re-enters the `processing → ... → sent` flow, and a new webhook delivery occurs on completion – with a NEW `event_id`. Deduplicate on `event_id`, not `session_id`, so the reprocessed event is not mistaken for a duplicate.

**Error responses:** 401, 404, 500.

---

## Delete a Session

`DELETE /v2/lab-reports/{session_id}`

Soft-delete a session. The session is marked deleted and a background process cleans up associated storage later.

**Path parameters:** `session_id` (string).

**Response – 204 No Content** (no body).

**Error responses:** 401, 404, 500.

---

Source: [API Reference](https://docs.tryterra.co/lab-reports/api-reference), [Core Concepts – Delivery Destinations](https://docs.tryterra.co/lab-reports/core-concepts).
