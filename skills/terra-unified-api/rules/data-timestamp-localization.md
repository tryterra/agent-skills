---
title: Handle Timestamp Localization Deliberately
impact: CRITICAL
tags: data, timezones
---

## Handle Timestamp Localization Deliberately

**Impact: CRITICAL**

Terra API timestamps include timezone offsets when the provider supplies them (e.g. `2026-04-02T00:00:00.000000+01:00`), and `metadata.timestamp_localization` tells you which convention the payload uses: `0` means UTC, `1` means the user's local time. Decide consciously how each table stores time. Daily-type tables should store only the calendar date (see `data-date-part-only`). For activity and sleep, storing `timestamp` without timezone keeps the wall-clock time the user experienced but loses the offset; storing `timestamptz` preserves the instant but shifts wall-clock display. Either is workable, but pick one knowingly and keep display logic consistent with it. The raw payload archive preserves the original strings if you need to revisit the decision.

**Incorrect (ignoring localization and mixing conventions):**

```typescript
// Some rows parsed as UTC, some as local, depending on which
// provider sent them - times drift by the user's offset
const start = new Date(item.metadata.start_time).toISOString();
```

**Correct (one explicit policy, checked against the flag):**

```typescript
// Policy: store wall-clock time as delivered; frontend displays as-is.
// metadata.timestamp_localization: 0 = UTC, 1 = user's local time
const startTime = item.metadata.start_time; // keep the delivered string/offset
const isLocalized = item.metadata.timestamp_localization === 1;
```

Reference: [Data models](https://docs.tryterra.co/reference/health-and-fitness-api/data-models)
