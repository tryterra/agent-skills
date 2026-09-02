---
title: Overwrite Standard Fields, Newest Ordering Timestamp Wins
impact: CRITICAL
tags: data, upserts, idempotency
---

## Overwrite Standard Fields, Newest Ordering Timestamp Wins

**Impact: CRITICAL**

For standard payload fields (biomarkers, activity and sleep fields), Terra API guarantees that re-delivered data "will always be a superset of any previous data received". When the same record arrives again (a provider synced more complete data), the new payload contains everything the old one did plus more. That makes plain overwrite upserts correct for these fields, with one caveat: "latest" must mean data recency, not arrival order. Retries back off for up to 8 hours, so a stale delivery can arrive after a fresher one. Deliveries carry an `X-Terra-Ordering-Timestamp` header (unix ms, stamped when Terra API emitted the payload, unchanged across retries); overwrite only when the incoming value is greater than or equal to the stored one, and skip otherwise. The header is omitted on the rare payload without a recency anchor; treat those as newest. The other exception is `data_enrichment` scores, which do NOT follow the superset guarantee (see `data-coalesce-enrichment-scores`).

**Incorrect (defensive merging where none is needed):**

```typescript
// Fetch existing row, field-by-field compare, keep "best" value...
const existing = await getDaily(connectionId, date);
const merged = mergeNonNull(existing, incoming); // complexity with no benefit
await save(merged);
```

**Correct (overwrite on conflict, gated on the ordering timestamp):**

```sql
INSERT INTO terra_daily (terra_connection_id, date, steps, resting_hr_bpm, ordering_ts, ...)
VALUES ($1, $2, $3, $4, $5, ...)
ON CONFLICT (terra_connection_id, date) DO UPDATE SET
  steps = excluded.steps,
  resting_hr_bpm = excluded.resting_hr_bpm,
  ordering_ts = excluded.ordering_ts
WHERE excluded.ordering_ts >= terra_daily.ordering_ts; -- reordered retries never regress data
```

Reference: [Receiving data updates](https://docs.tryterra.co/unified-api/managing-user-health-data/receiving-data-updates)
