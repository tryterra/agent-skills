---
name: terra-lab-reports
description: Best practices and API reference for Terra Lab Reports (pre-release) – convert clinical lab report PDFs and images into structured, standardized biomarker data. Use when parsing blood test results, extracting biomarkers, mapping to LOINC or UCUM unit codes, handling reference ranges, or working with PDF lab results and lab report OCR. Covers the async upload/standardize/deliver lifecycle, webhook and polling delivery, the Session to Results to Reference Ranges data model, null-biomarker handling, snowflake IDs, and idempotent event processing.
license: MIT
compatibility: Requires network access to docs.tryterra.co for full endpoint specs, payload examples, and enum tables
metadata:
  author: terra
  version: "1.0.0"
---

# Terra Lab Reports Best Practices

Production guidelines and API reference for building with the Terra Lab Reports API (**pre-release**). It converts clinical lab report PDFs and images into structured, standardized biomarker data: OCR plus AI extraction, then fuzzy matching against a 4,200+ biomarker reference dataset that yields canonical biomarker slugs, UCUM unit codes, and LOINC codes.

## What the Product Does

Upload a clinical lab report and receive structured biomarker results – extracted, standardized, and delivered to your destinations or available via REST.

- **Input:** one file per request – PDF, PNG, JPEG, GIF, or WebP, up to 20 MB.
- **Extraction:** OCR plus AI parsing pulls each result's name, value, units, flags, and reference ranges off the page.
- **Standardization:** each extracted name is fuzzy-matched against a 4,200+ biomarker dataset, producing a canonical `biomarker` slug, a UCUM-compliant `ucum_code`, and (for ~1,600 of the 4,200) a `loinc_code`.
- **Output:** a Session containing Results, each with Reference Ranges scoped by demographic Context.

## Async Workflow and Status Lifecycle

Processing is fully asynchronous. Upload returns immediately with `202` and the report moves through:

```
processing → processed → standardizing → standardized → sending → sent
```

Other statuses: `partially_sent`, `retry_scheduled`, `retrying`, `cancelled`, `deleted`, and `failed`. Terminal states are `sent`, `partially_sent`, `failed`, `cancelled`, `deleted`.

**Results are queryable once the session reaches `standardized`** – before delivery. You do not have to wait for `sent` to read them. Learn about completion via the `lab_report.completed` / `lab_report.failed` webhook events (recommended) or by polling. Processing typically takes 30 seconds to 3 minutes.

## Endpoints

Base URL `https://access.tryterra.co/api`. Every request needs both headers: `dev-id` and `x-api-key`.

| Method | Endpoint                                    | Notes                                                             |
| ------ | ------------------------------------------- | ---------------------------------------------------------------- |
| POST   | `/v2/lab-reports`                           | Multipart upload; field MUST be `file` (singular), one file/request. `202` returns `upload_id` + `current_status`. |
| GET    | `/v2/lab-reports`                           | List / filter (by `reference_id`, `upload_id`, date ranges). Capped at 500 – use date filters. |
| GET    | `/v2/lab-reports/{session_id}`              | Full session: metadata, results, ranges, status history. Immutable, cacheable. |
| GET    | `/v2/lab-reports/{session_id}/deliveries`   | Per-destination delivery state (mutable).                        |
| GET    | `/v2/lab-reports/{session_id}/files`        | Input files + thumbnail, presigned URLs minted on demand – they EXPIRE, re-fetch to re-mint. |
| GET    | `/v2/lab-reports/{session_id}/artifacts`    | Processing artifacts. Privileged keys only; standard keys get `404`. |
| POST   | `/v2/lab-reports/{session_id}/reprocess`    | Re-run extraction/standardization; emits a NEW `event_id`.       |
| DELETE | `/v2/lab-reports/{session_id}`              | Soft-delete; `204`.                                              |

[references/api-reference.md](references/api-reference.md) routes each goal to its endpoint and notes the semantics the spec page treats lightly; read it before implementing any endpoint call. For full request/response/error specs (RFC 7807 shapes, status codes), fetch the live page when building the call: [API Reference](https://docs.tryterra.co/lab-reports/api-reference) (append `.md` for markdown).

## Data Model

A hierarchy: **Session → Results[] → Reference Ranges[] → Context**.

- **Session** – `session_id` (snowflake string), `upload_id`, optional `reference_id`, `current_status`, report/collection dates and times, `lab_name`, `patient_sex`, `patient_age_at_collection`, `status_history[]`, `results_count`, `file_count`, `input_bytes`, `output_bytes`, and `results[]`.
- **Result** – `original_name` (verbatim), `display_name`, `biomarker`, `loinc_code`, `panel_name`, `result_type`, `specimen_type`, `raw_value`, `value` / `value_gt` / `value_lt`, `qualitative_value`, `display_units`, `ucum_code`, `flag`, `method`, `notes`, and `reference_ranges[]`.
- **Reference Range** – `lower_bound`, `upper_bound`, `classification`, and a `context`.
- **Context** – `sex`, `age_lower`, `age_upper`, `pregnancy_status`, `cycle_phase`, `gestational_week_lower`/`_upper`, `reference_population`, `modifiers[]`.

Delivery envelope semantics are in [references/webhook-payload.md](references/webhook-payload.md); for field-level types and the enum tables (which are open and grow over time), fetch the live [Core Concepts](https://docs.tryterra.co/lab-reports/core-concepts) page (append `.md` for markdown).

### Key Data Semantics

- **`biomarker` and `loinc_code` are present-but-null** when unmatched/unmapped. Every OTHER unset optional field is OMITTED entirely, not set to null. Do not conflate the two conventions.
- **`flag` is a raw lab string** (`"H"`, `"L"`, `"HH"`, `"↑"`, ...), NOT an enum – it is whatever the lab printed.
- **Enums are open.** `current_status`, `report_type`, `result_type`, `specimen_type`, `classification`, `patient_sex` may gain new values without a major version bump. Handle unknowns gracefully (default/unknown category, never throw).
- **`result_type`** is `numeric`, `qualitative`, or `text`. For bounded numeric results (">X" / "<X") the number is in `value_gt` / `value_lt`, and `value` is absent.
- All enum values are clean lowercase strings (`"sent"`, not `"REPORT_STATUS_SENT"` or `6`). All timestamps are ISO-8601 UTC.

## Gotchas

- **Upload returns `upload_id`, NOT `session_id`.** One upload can yield multiple reports (e.g. a multi-report PDF), so session ids are learned from webhook events or `GET /v2/lab-reports?upload_id=…`. Every session and event from that upload shares the `upload_id`.
- **`GET ?upload_id=` is eventually consistent.** Immediately after upload the sessions may not all exist yet – a query right after the `202` can return an empty or partial list. **Webhooks are the reliable completion signal.**
- **Webhook `data` is a focused resource, NOT the full session.** It has the report's identity, metadata, and standardized `results` – but no status history, byte counts, presigned files, or delivery state. Fetch those via `GET /v2/lab-reports/{session_id}` and its sub-resources.
- **`Terra-Reference` header** carries the session ID on webhook requests – use it for logging and dedup before parsing the body.
- **Failure error codes:** `file_unreadable` is NOT retriable (needs a clearer file); `extraction_failed`, `standardization_failed`, and `internal` ARE retriable.
- **Presigned file URLs expire.** They are never embedded in the session or webhook – re-fetch `/files` (or `/artifacts`) to mint fresh ones.

## Rules

Read the relevant rule in `rules/` before writing that code. Each is a standalone file with incorrect/correct examples, sourced from the docs' best-practices and core-concepts pages.

### Webhooks & Delivery (HIGH)

- `webhooks-dedupe-event-id` – Deduplicate on `event_id` (stable across redeliveries); a reprocess mints a NEW `event_id`, so do not dedupe on `session_id`.
- `api-poll-at-most-every-5s` – Webhooks for production, polling for dev/fallback; poll no faster than every 5 seconds and stop on a terminal status.

### Data Handling & API Usage (HIGH–MEDIUM)

- `data-keep-unmatched-biomarkers` – A null `biomarker` is clinically relevant; never discard it, fall back to `original_name` and flag for review.
- `data-filter-ranges-by-demographics` – Filter the multiple reference ranges by sex/age/context before interpreting; absent context applies to all; handle `value_gt`/`value_lt` conservatively.
- `data-store-ids-as-strings` – Snowflake `session_id`s lose precision as JS numbers; keep them strings end to end.
- `data-parse-utf8` – Data contains `µ`, `×`, `±`, superscripts; always parse as UTF-8.
- `api-space-bulk-uploads` – One file per request, 20 MB cap, 30s–3min each; space bulk uploads and tag with `reference_id`.

## References

Load these for full specs (each is self-contained):

- [references/api-reference.md](references/api-reference.md) – goal-to-endpoint routing plus the semantics the spec page treats lightly. Read before calling any endpoint; fetch the linked live page for full request/response shapes.
- [references/webhook-payload.md](references/webhook-payload.md) – event envelope semantics, the idempotency and correlation keys, and the failure-code retriability split. Read when building a webhook handler; fetch the linked live page for complete payload examples and enum tables.
- [references/biomarkers.md](references/biomarkers.md) – standardization, UCUM mappings, LOINC coverage, and common-biomarker tables by category. Read when working with slugs, units, or LOINC codes.

The full 4,200+ biomarker dataset (~700 KB JSON) is not bundled; download it from the [Biomarker Reference](https://docs.tryterra.co/lab-reports/biomarker-reference) page.

## Live Documentation

- [Overview](https://docs.tryterra.co/lab-reports)
- [Quick Start](https://docs.tryterra.co/lab-reports/quickstart)
- [Core Concepts](https://docs.tryterra.co/lab-reports/core-concepts)
- [API Reference](https://docs.tryterra.co/lab-reports/api-reference)
- [Webhook Payload](https://docs.tryterra.co/lab-reports/webhook-payload)
- [Biomarker Reference](https://docs.tryterra.co/lab-reports/biomarker-reference)
- [Best Practices](https://docs.tryterra.co/lab-reports/best-practices)
