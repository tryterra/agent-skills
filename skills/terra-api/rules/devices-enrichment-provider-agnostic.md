---
title: Treat Enrichment Scores as Provider-Agnostic
impact: MEDIUM
tags: multi-device, data-enrichment, scores
---

## Treat Enrichment Scores as Provider-Agnostic

**Impact: MEDIUM**

`data_enrichment` scores (stress, strain, resilience, sleep and readiness scores) are computed server-side by Terra API from the underlying data, for every provider. Unlike raw vendor scores, they are directly comparable across devices, so you do not need per-provider normalization or vendor-specific score handling. With multiple devices connected, auto-select the scores from the highest-priority provider for the `daily` category, and give users a manual override (only shown when 2+ active connections exist) since they may trust one device's data more.

**Incorrect (vendor-specific score plumbing):**

```typescript
// Separate code paths and scales per provider
const stress = provider === "GARMIN" ? garminStress(row)
             : provider === "WHOOP" ? whoopStrainToStress(row)
             : null; // unsupported provider, no score
```

**Correct (one enrichment path, priority-based selection with override):**

```typescript
const rows = await dailyRowsForDate(userId, date);
const selected = scoreConnectionId
  ? rows.find((r) => r.connectionId === scoreConnectionId) // user override
  : rows.sort(byPriority("daily"))[0];                     // auto-select
const scores = {
  stress: selected?.totalStressScore,
  strain: selected?.strainIndex,
  resilience: selected?.resilienceScore,
};
```

Reference: [Data models](https://docs.tryterra.co/reference/health-and-fitness-api/data-models)
