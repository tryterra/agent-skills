# Webhook Payload Reference

Webhook delivery format, complete payload example, failure schema, and enum tables for the Terra Lab Reports API (pre-release).

## How Webhooks Work

When a lab report session reaches `sent`, Terra API delivers an event to your configured webhook destination via HTTP POST. Your endpoint should return a `2xx` to acknowledge; non-2xx responses are retried.

Lab reports are not webhook-only. A completed report can be delivered to any configured destination – webhooks, cloud storage (S3, GCS, Azure Blob, Supabase), message queues (SQS, Kafka), and databases (MongoDB, Firestore, SQL). Delivery is opt-in per destination: add `"lab_report"` to a destination's `destination_event_types` allow-list. Storage destinations and document databases receive the full report body; row and message destinations receive a time-limited link to fetch it.

## Event Envelope

Every webhook is an event envelope – event metadata wraps the report itself under `data`:

```json
{
  "type": "lab_report.completed",
  "event_id": "evt_9f1c…",
  "occurred_at": "2026-03-28T14:23:45Z",
  "upload_id": "upl_4a2b…",
  "data": { "session_id": "…", "results": [ … ] }
}
```

| Field         | Type   | Description                                                     |
| ------------- | ------ | --------------------------------------------------------------- |
| `type`        | string | `lab_report.completed` (success) or `lab_report.failed` (failure) |
| `event_id`    | string | Unique per event – deduplicate redeliveries on it               |
| `occurred_at` | string | When the event occurred (ISO-8601, UTC)                         |
| `upload_id`   | string | Correlates every event produced from the same upload           |
| `data`        | object | The report resource (completed) or an error object (failed)    |

Key semantics:
- Branch on `type` in your handler.
- `event_id` is unique per event and stable across redeliveries; reprocessing emits a NEW `event_id`.
- `upload_id` ties every event from the same upload together (one upload can yield more than one report).
- `data` is a focused event resource – the report's identity, metadata, and standardized `results`. It is NOT the full session. It has no status history, byte counts, presigned files, or per-destination delivery state. For those, call `GET /v2/lab-reports/{session_id}` and its `/files`, `/artifacts`, `/deliveries` sub-resources.

### Terra-Reference Header

Webhook requests include a `Terra-Reference` header carrying the session ID. Use it for logging and deduplication before parsing the body.

```
Terra-Reference: 297405620317847552
```

## Complete Payload Example (lab_report.completed)

```json
{
  "type": "lab_report.completed",
  "event_id": "evt_9f1c2d7a8b3e4f56",
  "occurred_at": "2026-03-28T14:23:45Z",
  "upload_id": "upl_4a2b8c1d",
  "data": {
    "session_id": "297405620317847552",
    "reference_id": "patient_456",
    "report_date": "2026-03-15",
    "report_time": "09:30",
    "report_locale": "en-US",
    "results_count": 4,
    "report_notes": "Patient fasting for 12 hours prior to collection.",
    "results": [
      {
        "original_name": "Haemoglobin (Hb)",
        "display_name": "Hemoglobin",
        "biomarker": "hemoglobin",
        "loinc_code": "718-7",
        "panel_name": "CBC",
        "result_type": "numeric",
        "specimen_type": "blood",
        "raw_value": "14.2",
        "value": 14.2,
        "display_units": "g/dL",
        "ucum_code": "g/dL",
        "method": "Photometry",
        "collection_date": "2026-03-15",
        "collection_time": "08:15",
        "reference_ranges": [
          {
            "lower_bound": 13.0,
            "upper_bound": 17.0,
            "classification": "normal",
            "context": { "sex": "male", "age_lower": 18, "modifiers": ["fasting"] }
          }
        ]
      },
      {
        "original_name": "Thyroid Stimulating Hormone",
        "display_name": "TSH",
        "biomarker": "thyroid_stimulating_hormone",
        "loinc_code": "11580-8",
        "panel_name": "Thyroid",
        "result_type": "numeric",
        "specimen_type": "blood",
        "raw_value": "2.45",
        "value": 2.45,
        "display_units": "mIU/L",
        "ucum_code": "m[IU]/L",
        "reference_ranges": [
          { "lower_bound": 0.27, "upper_bound": 4.2, "classification": "normal", "context": { "age_lower": 18 } },
          { "lower_bound": 0.2, "upper_bound": 3.0, "classification": "normal", "context": { "sex": "female", "age_lower": 18, "pregnancy_status": "trimester_1" } }
        ]
      },
      {
        "original_name": "Hepatitis B Surface Antigen",
        "display_name": "Hepatitis B Surface Antigen",
        "biomarker": "hepatitis_b_surface_antigen",
        "loinc_code": null,
        "result_type": "qualitative",
        "specimen_type": "blood",
        "raw_value": "Negative",
        "qualitative_value": "Negative",
        "method": "ECLIA",
        "reference_ranges": []
      },
      {
        "original_name": "Prostate Specific Antigen",
        "display_name": "PSA",
        "biomarker": "prostate_specific_antigen",
        "loinc_code": "2857-1",
        "panel_name": "Tumor Markers",
        "result_type": "numeric",
        "specimen_type": "blood",
        "raw_value": "<0.04",
        "value_lt": 0.04,
        "display_units": "ng/mL",
        "ucum_code": "ng/mL",
        "reference_ranges": [
          { "lower_bound": 0.0, "upper_bound": 4.0, "classification": "normal", "context": { "sex": "male", "age_lower": 40, "age_upper": 49 } }
        ]
      }
    ]
  }
}
```

Note the `loinc_code: null` (matched biomarker with no LOINC mapping – present but null), the empty `reference_ranges: []` on the qualitative result, the two demographic ranges on TSH, and the bounded `value_lt` (no `value`) on PSA.

## Failure Webhook (lab_report.failed)

If a report can't be processed, Terra API delivers a failure webhook to the same destination(s) instead of the success payload. Same envelope; its `data` carries `session_id`, `reference_id`, and an `error` object.

```json
{
  "type": "lab_report.failed",
  "event_id": "evt_7b3e1a9c4d2f",
  "occurred_at": "2026-03-28T14:23:45Z",
  "upload_id": "upl_4a2b8c1d",
  "data": {
    "session_id": "297405620317847552",
    "reference_id": "patient_456",
    "error": {
      "code": "extraction_failed",
      "message": "Failed to extract biomarker data from the uploaded file.",
      "retriable": true
    }
  }
}
```

### Error Object

| Field       | Type    | Description                                                              |
| ----------- | ------- | ----------------------------------------------------------------------- |
| `code`      | string  | Machine-readable failure code (see below)                               |
| `message`   | string  | Human-readable description                                              |
| `retriable` | boolean | `true` if re-uploading the same report may succeed; `false` if it won't  |

### Error Codes

| Code                     | Retriable | Meaning                                                            |
| ------------------------ | --------- | ------------------------------------------------------------------ |
| `file_unreadable`        | `false`   | The uploaded file couldn't be read – upload a clearer scan/export. |
| `extraction_failed`      | `true`    | Biomarker extraction failed; a retry may succeed.                  |
| `standardization_failed` | `true`    | Biomarker standardization failed; a retry may succeed.             |
| `internal`               | `true`    | An internal error occurred; a retry may succeed.                   |

## Field Specifications

### Data Object (lab_report.completed)

A focused event resource, NOT the full session.

| Field           | Type      | Description                                          |
| --------------- | --------- | --------------------------------------------------- |
| `session_id`    | string    | Snowflake int64 ID (as string) – always present     |
| `reference_id`  | string    | Your external identifier (from upload query param)  |
| `report_date`   | string    | Date from the lab report (`YYYY-MM-DD`)             |
| `report_time`   | string    | Time from the lab report (`HH:MM` 24-hour)          |
| `report_locale` | string    | Locale of the report (e.g. `"ja-JP"`, `"pt-BR"`)    |
| `results_count` | integer   | Number of biomarker results – always present        |
| `results`       | object\[] | Array of biomarker result objects – always present  |
| `report_notes`  | string    | Free-text notes extracted from the report           |

### Result Object

| Field               | Type            | Description                                                        |
| ------------------- | --------------- | ----------------------------------------------------------------- |
| `original_name`     | string          | Exact biomarker name as printed on the report                     |
| `display_name`      | string          | Standardized English name                                         |
| `biomarker`         | string \| null  | Canonical slug; always present, **null** when no match found      |
| `loinc_code`        | string \| null  | LOINC code; always present, **null** when not mapped              |
| `panel_name`        | string?         | Report section header (omitted if not identified)                 |
| `result_type`       | string          | `numeric`, `qualitative`, or `text`                               |
| `specimen_type`     | string          | `blood`, `serum`, `plasma`, `urine`, `saliva`, `stool`, `other`   |
| `raw_value`         | string          | The value exactly as printed                                      |
| `value`             | number?         | Parsed numeric value (omitted for qualitative/text)               |
| `value_gt`          | number?         | Lower bound when the result is ">X"                               |
| `value_lt`          | number?         | Upper bound when the result is "<X"                               |
| `qualitative_value` | string?         | Categorical result (e.g. "Non-Reactive", "Positive")             |
| `display_units`     | string          | Units as printed on the report                                    |
| `ucum_code`         | string          | UCUM-compliant unit code (omitted if not mappable)                |
| `flag`              | string?         | Raw lab flag string (e.g. `"H"`, `"L"`); NOT an enum, omitted if none |
| `method`            | string?         | Lab methodology (e.g. "ECLIA")                                    |
| `notes`             | string?         | Additional lab comments                                           |
| `collection_date`   | string?         | Specimen collection date for this result (`YYYY-MM-DD`)          |
| `collection_time`   | string?         | Specimen collection time for this result (`HH:MM` 24-hour)       |
| `reference_ranges`  | object\[]       | Array of reference range objects                                  |

### Reference Range Object

| Field            | Type    | Description                                              |
| ---------------- | ------- | ------------------------------------------------------- |
| `lower_bound`    | number? | Lower limit (omitted for one-sided ranges like "< 4.0") |
| `upper_bound`    | number? | Upper limit (omitted for one-sided ranges like "> 1.0") |
| `classification` | string  | See Classification enum below                           |
| `context`        | object? | Demographic context for when this range applies         |

### Context Object

| Field                    | Type      | Description                                                        |
| ------------------------ | --------- | ----------------------------------------------------------------- |
| `sex`                    | string    | `male`, `female`, or omitted (applies to all)                     |
| `age_lower`              | integer?  | Minimum age in years this range applies to                        |
| `age_upper`              | integer?  | Maximum age in years (omitted = no upper limit)                   |
| `pregnancy_status`       | string?   | `trimester_1`, `trimester_2`, `trimester_3` (or omitted)          |
| `cycle_phase`            | string?   | Menstrual cycle phase (or omitted)                                |
| `gestational_week_lower` | integer?  | Lower gestational week bound (omitted if not applicable)          |
| `gestational_week_upper` | integer?  | Upper gestational week bound (omitted if not applicable)          |
| `reference_population`   | string?   | Reference population (e.g. `nhanes_iii`, `young_adult`)           |
| `modifiers`              | string\[] | Additional qualifiers (e.g. `["fasting", "supine"]`)              |

## Enum Reference

All enum values are clean lowercase strings – not proto-style names (`REPORT_STATUS_SENT`) or integer codes. Enums are OPEN: new values may appear in future updates without a major version bump, so handle unknown values gracefully (treat as a default/unknown category rather than throwing). The `flag` field is a raw lab string, not an enum.

### Status

| Value             | Description                                              |
| ----------------- | -------------------------------------------------------- |
| `processing`      | Extracting biomarker data from the file                  |
| `processed`       | Extraction complete                                      |
| `standardizing`   | Matching biomarkers and normalizing units                |
| `standardized`    | Standardization complete, results queryable              |
| `sending`         | Delivering the report to configured destinations         |
| `sent`            | Delivered to all opted-in destinations (terminal)        |
| `partially_sent`  | Delivered to at least one destination, failed others (terminal) |
| `failed`          | An error occurred (terminal)                             |
| `retry_scheduled` | Retry has been scheduled                                 |
| `retrying`        | Retry in progress                                        |
| `cancelled`       | Processing was cancelled (terminal)                      |
| `deleted`         | Session has been deleted (terminal)                      |

### Classification

`normal`, `low`, `high`, `borderline_low`, `borderline_high`, `critical_low`, `critical_high`, `abnormal`, `therapeutic`, `subtherapeutic`, `toxic`.

### Specimen Type

`blood`, `serum`, `plasma`, `urine`, `saliva`, `stool`, `other`.

### Result Type

`numeric` (numeric measurement), `qualitative` (categorical outcome), `text` (free-text observation).

### Biological Sex

`male`, `female`.

### Report Type

`lab`.

---

Source: [Webhook Payload](https://docs.tryterra.co/lab-reports/webhook-payload), [Core Concepts](https://docs.tryterra.co/lab-reports/core-concepts).
