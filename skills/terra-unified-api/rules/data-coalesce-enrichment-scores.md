---
title: COALESCE Enrichment Scores, Nulls Never Overwrite
impact: CRITICAL
impactDescription: plain overwrites silently erase scores
tags: data, upserts, data-enrichment
---

## COALESCE Enrichment Scores, Nulls Never Overwrite

**Impact: CRITICAL (plain overwrites silently erase scores)**

`data_enrichment` scores (stress, strain, resilience, cardio load (RCRS, run-cardiorespiratory strain), immunity, respiratory, sleep, readiness and biological age) are computed server-side by Terra API and do NOT follow the superset guarantee: a later webhook for the same day can arrive with null enrichment even though an earlier delivery carried values. If score columns use the same plain-overwrite upsert as biomarkers, those nulls erase real scores and your dashboards regress randomly. Upsert score columns with `COALESCE(excluded.col, table.col)` so an incoming null preserves the stored value, while incoming values still update normally.

Trend-based scores make this sharper. `biological_age` arrives on the **daily** payload and needs several weeks of history before it produces anything, so a user's early days carry it as null and it only starts appearing later – a plain overwrite will keep wiping it every time a backfilled early day is re-delivered. Model it as a column on your daily table, not a sleep one: it is derived from overnight physiology but emitted once per day, so a per-sleep column would take two near-identical values on a day with a nap.

**Incorrect (one overwrite strategy for everything):**

```sql
ON CONFLICT (terra_connection_id, date) DO UPDATE SET
  steps = excluded.steps,
  total_stress_score = excluded.total_stress_score, -- null wipes the score
  strain_index = excluded.strain_index;
```

**Correct (two strategies: overwrite biomarkers, COALESCE scores):**

```sql
ON CONFLICT (terra_connection_id, date) DO UPDATE SET
  -- biomarkers: superset guarantee, latest wins
  steps = excluded.steps,
  resting_hr_bpm = excluded.resting_hr_bpm,
  -- enrichment scores: nulls never overwrite
  total_stress_score = COALESCE(excluded.total_stress_score, terra_daily.total_stress_score),
  strain_index = COALESCE(excluded.strain_index, terra_daily.strain_index),
  -- trend scores stay null for a user's first weeks, so this matters most here
  biological_age = COALESCE(excluded.biological_age, terra_daily.biological_age);
```

Reference: [Data models](https://docs.tryterra.co/reference/health-and-fitness-api/data-models)
