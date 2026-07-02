---
title: Override SDK Types for v6 Fields
impact: MEDIUM
impactDescription: the npm SDK trails the API; enrichment fields are missing or mistyped
tags: sdk, typescript, types
---

## Override SDK Types for v6 Fields

**Impact: MEDIUM (the npm SDK trails the API; enrichment fields are missing or mistyped)**

The `terra-api` npm SDK aligns with v5 of Terra API, but v6 payloads already arrive at your webhook. Several `data_enrichment` fields are absent from the SDK types:

- **Daily**: `resilience_score`, `strain_index`, `strain_traffic_light`, `total_stress_score_v2` (and their contributors)
- **Sleep**: `readiness_score`, `sleep_score_v2`, `respiratory_score_v2`
- **Activity**: `efficiency_score`, `strain_score`, `rcrs_score`, `trimp_score`

And one is mistyped: the SDK declares contributors as `DataContributor[]` (`{contributor_name, contributor_score}[]`), but the v6 proto uses `map<string, float>`, i.e. `Record<string, number>` on the wire.

Do not scatter `as any` casts at every access site. Centralize the corrections in one override module that strips the stale fields with `Omit` and redeclares them, then re-export the augmented namespace. When the SDK catches up, delete the override file and switch imports back to `"terra-api"`.

**Incorrect (per-site casts everywhere):**

```typescript
const strain = (item.data_enrichment as any).strain_index; // repeated in
const contributors = (item.data_enrichment as any).stress_contributors; // every handler
```

**Correct (one override module):**

```typescript
// terra-types-v6-override.ts
import type { Terra } from "terra-api";

export type ScoreContributors = Record<string, number>; // v6 proto: map<string, float>

export interface DailyEnrichmentV6
  extends Omit<NonNullable<Terra.Daily["data_enrichment"]>, "stress_contributors"> {
  resilience_score?: number;
  strain_index?: number;
  strain_traffic_light?: string;
  total_stress_score_v2?: number;
  stress_contributors?: ScoreContributors;
}

// handlers import the override, not the raw SDK type
const enrichment = item.data_enrichment as DailyEnrichmentV6 | undefined;
```

Reference: [Data models](https://docs.tryterra.co/reference/health-and-fitness-api/data-models)
