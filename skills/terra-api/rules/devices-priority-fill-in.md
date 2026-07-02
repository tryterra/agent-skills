---
title: Fill Missing Metrics From Lower-Priority Providers
impact: MEDIUM
impactDescription: no blank metrics when the top device lacks a sensor
tags: multi-device, merging, biomarkers
---

## Fill Missing Metrics From Lower-Priority Providers

**Impact: MEDIUM (no blank metrics when the top device lacks a sensor)**

Choosing one winning provider for the whole day throws data away: the highest-priority device may not measure every metric (a ring has no VO2 max; a scale has no steps). Merge per metric instead: sort the day's records by category priority, then for each metric take the first non-null value walking down the list. The best source wins where it has data, and lower-priority providers fill the gaps. Tag every resolved value with the provider it came from so the UI can attribute it.

**Incorrect (single winner for all metrics):**

```typescript
const best = rows.sort(byPriority("daily"))[0];
return { steps: best.steps, vo2max: best.vo2max }; // vo2max: null even though
// another connected device measured it
```

**Correct (per-metric fill-in):**

```typescript
const sorted = rows.sort(byPriority("daily"));
function firstNonNull<K extends keyof DailyRow>(key: K) {
  for (const row of sorted) {
    if (row[key] != null) return { value: row[key], provider: row.provider };
  }
  return null;
}
return {
  steps: firstNonNull("steps"),
  restingHr: firstNonNull("restingHrBpm"),
  vo2max: firstNonNull("vo2max"), // falls through to the device that has it
};
```

Use the category that matches the metric: sleep duration resolves with the `sleep` priority list even when shown next to `daily` biomarkers.

Reference: [Data models](https://docs.tryterra.co/reference/health-and-fitness-api/data-models)
