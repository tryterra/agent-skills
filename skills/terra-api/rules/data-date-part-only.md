---
title: Key Daily-Type Data by Date Part Only
impact: CRITICAL
impactDescription: timezone conversion shifts records to the wrong day
tags: data, timezones, idempotency
---

## Key Daily-Type Data by Date Part Only

**Impact: CRITICAL (timezone conversion shifts records to the wrong day)**

Terra API's guidance for daily, body, nutrition, and menstruation data is to "only consider the date part of the field, and ignore the time". Timestamps like `2026-04-02T00:00:00.000000+01:00` carry a timezone offset; if you parse them into a Date object and convert to UTC before extracting the day, midnight local time becomes 23:00 the previous day and the record lands on the wrong date, breaking your (connection, date) uniqueness. Extract the date by slicing the first 10 characters of the ISO string BEFORE any parsing or conversion, and store it in a plain `date` column.

**Incorrect (parse, convert, then extract):**

```typescript
const start = new Date(item.metadata.start_time);        // converts to UTC
const date = start.toISOString().slice(0, 10);           // "2026-04-01" - wrong day
```

**Correct (slice the string first):**

```typescript
const date = item.metadata.start_time.slice(0, 10);      // "2026-04-02" - as delivered
```

```sql
CREATE TABLE terra_daily (
  terra_connection_id uuid NOT NULL,
  date date NOT NULL,               -- calendar date, no time component
  ...,
  PRIMARY KEY (terra_connection_id, date)
);
```

Reference: [Receiving data updates](https://docs.tryterra.co/health-and-fitness-api/managing-user-health-data/receiving-data-updates)
