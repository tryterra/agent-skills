---
title: Extract Metrics Into Typed Columns, Not JSON Blobs
impact: CRITICAL
impactDescription: blob upserts recreate the null-overwrite problem
tags: data, schema, storage
---

## Extract Metrics Into Typed Columns, Not JSON Blobs

**Impact: CRITICAL (blob upserts recreate the null-overwrite problem)**

Storing whole Terra API payloads as JSONB and upserting the blob looks convenient but is a trap: a full-blob overwrite cannot apply per-field strategies, so an enrichment-null delivery erases scores inside the blob exactly as described in `data-coalesce-enrichment-scores`, and every read pays for JSON path digging. Extract the metrics you display into typed columns (`real` for scores, `integer` for steps, `date` for calendar dates) during webhook processing, apply the right upsert strategy per column, and keep the full raw payload in object storage linked via `payload_key` (see `webhooks-archive-raw-payloads`) for everything else.

**Incorrect (JSONB blob per day):**

```sql
CREATE TABLE terra_daily (
  terra_connection_id uuid,
  date date,
  payload jsonb, -- full-blob upsert erases enrichment scores with nulls
  PRIMARY KEY (terra_connection_id, date)
);
```

**Correct (typed columns per metric, raw payload archived):**

```sql
CREATE TABLE terra_daily (
  terra_connection_id uuid,
  date date,
  steps integer,
  resting_hr_bpm real,
  avg_hrv_sdnn real,
  total_stress_score real,   -- COALESCE upsert
  strain_index real,         -- COALESCE upsert
  payload_key text,          -- object storage key for the raw payload
  PRIMARY KEY (terra_connection_id, date)
);
```

Reference: [Data models](https://docs.tryterra.co/reference/health-and-fitness-api/data-models)
