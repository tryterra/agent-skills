---
title: Treat Enrichment Scores as Provider-Agnostic
impact: MEDIUM
tags: multi-device, data-enrichment, scores
---

## Treat Enrichment Scores as Provider-Agnostic

**Impact: MEDIUM**

`data_enrichment` scores (stress, strain, resilience, sleep, readiness and biological age) are computed server-side by Terra API from the underlying data, for every provider. Unlike raw vendor scores, they share one scale and are directly comparable across devices, so you do not need per-provider normalization, vendor-specific score handling, or separate code paths per wearable brand. One extraction and display path covers every connected source.

One caveat on comparability: scores built from trends rather than single records (`biological_age` is the current example) additionally require the device to have been reporting for several weeks. They are comparable across brands once present, but a newly connected source will carry them as null for longer than the per-record scores.

Provider-agnostic does not mean unconditionally present: scores are computed only when the corresponding score weightings are active for your client, and activity scores additionally require an eligible activity type (running/cycling-style workouts). Treat a missing score as an expected state, not a provider gap to work around.

**Incorrect (vendor-specific score plumbing):**

```typescript
// Separate code paths and scales per provider
const stress =
  provider === "GARMIN"
    ? garminStress(row)
    : provider === "WHOOP"
      ? whoopStrainToStress(row)
      : null; // unsupported provider, no score
```

**Correct (one enrichment path regardless of provider):**

```typescript
// Works identically for every provider Terra API supports
const scores = {
  stress: row.data_enrichment?.total_stress_score,
  strain: row.data_enrichment?.strain_index,
  resilience: row.data_enrichment?.resilience_score,
};
```

Reference: [Data models](https://docs.tryterra.co/reference/health-and-fitness-api/data-models)
