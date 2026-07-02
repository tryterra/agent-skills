---
title: Key Data by Terra API Natural Identifiers
impact: CRITICAL
impactDescription: wrong keys create duplicate rows on every re-delivery
tags: data, idempotency, schema
---

## Key Data by Terra API Natural Identifiers

**Impact: CRITICAL (wrong keys create duplicate rows on every re-delivery)**

Terra API re-delivers data whenever a provider updates it, so inserts must be idempotent upserts keyed by the identifier Terra API itself uses for uniqueness. Activity and sleep records are unique by `metadata.summary_id`. Daily, body, nutrition, and menstruation records are unique per connection per calendar date. Surrogate UUID primary keys on data tables add nothing and invite duplicates because nothing stops two rows for the same summary.

| Data type | Unique by |
|---|---|
| Activity | `metadata.summary_id` |
| Sleep | `metadata.summary_id` |
| Daily | (connection, date) |
| Body | (connection, date) |
| Nutrition | (connection, date) |
| Menstruation | (connection, date) |

**Incorrect (surrogate key, plain insert):**

```sql
CREATE TABLE terra_activity (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), -- nothing enforces uniqueness
  summary_id text,
  ...
);
INSERT INTO terra_activity (summary_id, ...) VALUES (...); -- duplicates on re-delivery
```

**Correct (natural key, upsert):**

```sql
CREATE TABLE terra_activity (
  summary_id text PRIMARY KEY, -- Terra API's own identifier
  ...
);
INSERT INTO terra_activity (summary_id, ...) VALUES (...)
ON CONFLICT (summary_id) DO UPDATE SET ...;
```

Reference: [Receiving data updates](https://docs.tryterra.co/health-and-fitness-api/managing-user-health-data/receiving-data-updates)
