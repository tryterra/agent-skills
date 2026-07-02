---
name: terra-lab-reports
description: Best practices and API reference for Terra Lab Reports (pre-release) – convert clinical lab report PDFs and images into structured, standardized biomarker data. Use when parsing blood test results, extracting biomarkers, mapping to LOINC or UCUM unit codes, handling reference ranges, or working with PDF lab results and lab report OCR. Covers the async upload/standardize/deliver lifecycle, webhook and polling delivery, the Session to Results to Reference Ranges data model, unmatched-biomarker handling, snowflake IDs, and idempotent webhook processing.
license: MIT
compatibility: Requires network access to docs.tryterra.co for full endpoint specs, payload examples, and enum tables
metadata:
  author: terra
  version: "1.0.0"
---

# Terra Lab Reports Best Practices

Production guidelines and API reference for building with the Terra Lab Reports API (**pre-release**). It converts clinical lab report PDFs and images into structured, standardized biomarker data: OCR plus AI extraction, then fuzzy matching against a reference dataset of ~4,130 biomarkers that yields canonical biomarker keys, UCUM unit codes, and LOINC codes.

**Pre-release caveat:** verify behavior against the live API before shipping. The contract is pre-release and may change; trust what the API actually returns.

## What the Product Does

Upload a clinical lab report and receive structured biomarker results – extracted, standardized, and delivered to your destinations or available via REST.

- **Input:** one file per request – PDF, PNG, JPEG, GIF, or WebP, up to 20 MB. One session per file.
- **Extraction:** OCR plus AI parsing pulls each result's name, value, units, flags, and reference ranges off the page.
- **Standardization:** each extracted name is fuzzy-matched (threshold 0.85) against the ~4,130-entry biomarker dataset, producing a canonical `biomarker_key`, a UCUM-compliant `ucum_code`, and (for ~1,579 of the ~4,130) a `loinc_code`.
- **Output:** a Session containing Results, each with Reference Ranges scoped by demographic Context.

## Async Workflow and Status Lifecycle

Processing is fully asynchronous. Upload returns immediately with `202` (`current_status: "processing"`) and the report moves through:

```
processing → processed → standardizing → standardized → sending → sent
```

Other statuses: `retry_scheduled`, `retrying`, `cancelled`, `deleted`, and `failed`. Terminal states are `sent`, `failed`, `cancelled`, `deleted`.

**Results are queryable once the session reaches `standardized`** – before delivery. You do not have to wait for `sent` to read them. Learn about completion via the `lab_report` webhook (recommended, fired only on success) or by polling `GET /v2/lab-reports/{session_id}`. Processing typically takes 30 seconds to 3 minutes.

## Endpoints

Base URL `https://access.tryterra.co/api`. Every request needs both headers: `dev-id` and `x-api-key`.

| Method | Endpoint                                    | Notes                                                             |
| ------ | ------------------------------------------- | ---------------------------------------------------------------- |
| POST   | `/v2/lab-reports`                           | Multipart upload; field MUST be `file` (singular), one file/request. `202` returns `session_id` + `current_status: "processing"`. |
| GET    | `/v2/lab-reports`                           | List / filter (by `reference_id`, `report_date_from`/`_to`, `uploaded_at_from`/`_to`). Capped at 500 – use date filters. |
| GET    | `/v2/lab-reports/{session_id}`              | Full session: metadata, results, ranges, status history, and inline `input_files` / `thumbnail` / `artifacts` (each a presigned URL + `expires_at`). |
| POST   | `/v2/lab-reports/{session_id}/reprocess`    | Re-run extraction/standardization; async `202`. On success emits a NEW `lab_report` webhook with the SAME `session_id`. |
| DELETE | `/v2/lab-reports/{session_id}`              | Soft-delete; `204`.                                              |

There are NO `/files`, `/deliveries`, or `/artifacts` sub-endpoints – input files, thumbnail, and artifacts come inline in the GET-session response. Artifacts are only included for privileged keys; for standard keys the field is omitted (not a `404`).

[references/api-reference.md](references/api-reference.md) routes each goal to its endpoint and notes the semantics the spec page treats lightly; read it before implementing any endpoint call. For full request/response/error specs (RFC 7807 shapes, status codes), fetch the live page when building the call: [API Reference](https://docs.tryterra.co/lab-reports/api-reference) (append `.md` for markdown).

## Data Model

A hierarchy: **Session → Results[] → Reference Ranges[] → Context**.

- **Session** – `session_id` (snowflake string), optional `reference_id`, `current_status`, `report_type`, report/collection dates and times, `report_locale`, `lab_name`, `patient_sex`, `patient_age_at_collection`, `status_history[]`, `results_count`, `file_count`, `input_bytes`, `output_bytes`, `report_notes`, `results[]`, and inline `input_files[]` / `thumbnail` / `artifacts[]`.
- **Result** – `original_name` (verbatim), `display_name`, `biomarker_key`, `loinc_code`, `panel_name`, `result_type`, `specimen_type`, `raw_value`, `value` / `value_gt` / `value_lt`, `qualitative_value`, `display_units`, `ucum_code`, `flag`, `method`, `notes`, and `reference_ranges[]`.
- **Reference Range** – `lower_bound`, `upper_bound`, `classification`, `display_text`, and a `context`.
- **Context** – `sex`, `age_lower`, `age_upper`, `pregnancy_status`, `cycle_phase`, `gestational_week_lower`/`_upper`, `reference_population`, `modifiers[]`.

Webhook envelope semantics are in [references/webhook-payload.md](references/webhook-payload.md); for field-level types and the enum tables (which are open and grow over time), fetch the live [Core Concepts](https://docs.tryterra.co/lab-reports/core-concepts) page (append `.md` for markdown).

### Key Data Semantics

- **`biomarker_key` and `loinc_code` are OMITTED entirely** when unmatched/unmapped (they are `omitempty` pointers, not present-but-null). Detect an unmatched result by the field being *absent*, and fall back to `original_name`. Every other unset optional field is likewise omitted, never set to null.
- **`flag` is a raw lab string** (`"H"`, `"L"`, `"HH"`, `"↑"`, ...), NOT an enum – it is whatever the lab printed.
- **Enums are open.** `current_status`, `report_type`, `result_type`, `specimen_type`, `classification`, `patient_sex` may gain new values without a major version bump. Handle unknowns gracefully (default/unknown category, never throw).
- **`result_type`** is `numeric`, `qualitative`, or `text`. For bounded numeric results (">X" / "<X") the number is in `value_gt` / `value_lt`, and `value` is absent.
- All enum values are clean lowercase strings (`"sent"`, not `"REPORT_STATUS_SENT"` or `6`). All timestamps are ISO-8601 UTC.

## Gotchas

- **Upload returns `session_id`, not a separate handle.** The `202` body is `{ "session_id": "...", "current_status": "processing" }`; there is no `upload_id`. One file yields exactly one session.
- **Webhooks fire only on success.** A `lab_report` webhook is emitted after standardization succeeds; on permanent failure the pipeline transitions the session to `failed` and emits NO webhook. Detect failures by polling `GET /v2/lab-reports/{session_id}` for `current_status: "failed"` (a freeform `report_notes` such as "extraction failed" may accompany it). There is no `lab_report.failed` event and no error-code taxonomy.
- **The webhook body is FLAT and focused.** It carries `type: "lab_report"`, `session_id`, `reference_id`, report metadata, `results_count`, and standardized `results` – but no status history, byte counts, presigned files, or delivery state. There is no `data` wrapper, no `.completed`/`.failed` suffix, no `event_id`, no `occurred_at`. Fetch the omitted fields via `GET /v2/lab-reports/{session_id}`.
- **`Terra-reference` and `X-Terra-Trace-Id` headers both carry the `session_id`** on webhook requests – use them for logging and dedup before parsing the body. A reprocess reuses the same `session_id`, so both headers are unchanged across the original and reprocessed webhooks (see rules/webhooks-dedupe-session-id.md).
- **Presigned file URLs are embedded and expire.** `input_files[].presigned_url`, `thumbnail.presigned_url`, and `artifacts[].presigned_url` come inline in the GET-session response, each with an `expires_at` (roughly one hour out). Re-mint by re-fetching `GET /v2/lab-reports/{session_id}` – do not persist a URL past its `expires_at`.
- **Oversize uploads:** a file over 20 MB is normally rejected with `400` ("invalid multipart form or file too large") via the byte-limit reader; a `413` only fires when the multipart part declares a Content-Length over the cap. Expect `400` (sometimes `413`).

## Rules

Read the relevant rule in `rules/` before writing that code. Each is a standalone file with incorrect/correct examples.

### Webhooks & Delivery (HIGH)

- `webhooks-dedupe-session-id` – Key idempotency on `session_id` PLUS content (e.g. `results_count` or a payload hash); a reprocess emits a new webhook with the SAME `session_id` and headers, so `session_id` alone is not a duplicate key.
- `api-poll-at-most-every-5s` – Webhooks for production, polling for dev/fallback and for detecting `failed`; poll no faster than every 5 seconds and stop on a terminal status.

### Data Handling & API Usage (HIGH–MEDIUM)

- `data-keep-unmatched-biomarkers` – An absent `biomarker_key` is clinically relevant; never discard the result, fall back to `original_name` and flag for review.
- `data-filter-ranges-by-demographics` – Filter the multiple reference ranges by sex/age/context before interpreting; absent context applies to all; handle `value_gt`/`value_lt` conservatively.
- `data-store-ids-as-strings` – Snowflake `session_id`s lose precision as JS numbers; keep them strings end to end.
- `data-parse-utf8` – Data contains `µ`, `×`, `±`, superscripts; always parse as UTF-8.
- `api-space-bulk-uploads` – One file per request, 20 MB cap, 30s–3min each; space bulk uploads and tag with `reference_id`.

## References

Load these for full specs (each is self-contained):

- [references/api-reference.md](references/api-reference.md) – goal-to-endpoint routing plus the semantics the spec page treats lightly. Read before calling any endpoint; fetch the linked live page for full request/response shapes.
- [references/webhook-payload.md](references/webhook-payload.md) – the flat webhook envelope, the idempotency and correlation keys, and how failures surface (via polling, not a webhook). Read when building a webhook handler.
- [references/biomarkers.md](references/biomarkers.md) – standardization, UCUM mappings, LOINC coverage, and common-biomarker tables by category. Read when working with keys, units, or LOINC codes.

The full ~4,130-entry biomarker dataset (~700 KB) is not bundled; download it from the [Biomarker Reference](https://docs.tryterra.co/lab-reports/biomarker-reference) page.

## Live Documentation

Append `.md` to any page URL for markdown. If the terra-docs MCP server (`https://docs.tryterra.co/~gitbook/mcp`) is connected, use its tools to search and fetch these pages instead. Where a page disagrees with observed API behavior, the behavior described in this skill takes precedence.

- [Overview](https://docs.tryterra.co/lab-reports)
- [Quick Start](https://docs.tryterra.co/lab-reports/quickstart)
- [Core Concepts](https://docs.tryterra.co/lab-reports/core-concepts)
- [API Reference](https://docs.tryterra.co/lab-reports/api-reference)
- [Webhook Payload](https://docs.tryterra.co/lab-reports/webhook-payload)
- [Biomarker Reference](https://docs.tryterra.co/lab-reports/biomarker-reference)
- [Best Practices](https://docs.tryterra.co/lab-reports/best-practices)
