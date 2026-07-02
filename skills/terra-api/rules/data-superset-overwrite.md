---
title: Overwrite Standard Fields, Latest Delivery Wins
impact: CRITICAL
tags: data, upserts, idempotency
---

## Overwrite Standard Fields, Latest Delivery Wins

**Impact: CRITICAL**

For standard payload fields (biomarkers, activity and sleep fields), Terra API guarantees that re-delivered data "will always be a superset of any previous data received". When the same record arrives again (a provider synced more complete data), the new payload contains everything the old one did plus more. That makes plain overwrite upserts safe and correct for these fields: keep no merge logic, just let the latest webhook win on the natural key. The exception is `data_enrichment` scores, which do NOT follow this guarantee (see `data-coalesce-enrichment-scores`).

**Incorrect (defensive merging where none is needed):**

```typescript
// Fetch existing row, field-by-field compare, keep "best" value...
const existing = await getDaily(connectionId, date);
const merged = mergeNonNull(existing, incoming); // complexity with no benefit
await save(merged);
```

**Correct (plain overwrite on conflict):**

```sql
INSERT INTO terra_daily (terra_connection_id, date, steps, resting_hr_bpm, ...)
VALUES ($1, $2, $3, $4, ...)
ON CONFLICT (terra_connection_id, date) DO UPDATE SET
  steps = excluded.steps,
  resting_hr_bpm = excluded.resting_hr_bpm;
```

Reference: [Receiving data updates](https://docs.tryterra.co/health-and-fitness-api/managing-user-health-data/receiving-data-updates)
