---
title: Rank Providers Per Data Category
impact: MEDIUM
impactDescription: the best sensor wins for each kind of data
tags: multi-device, merging, providers
---

## Rank Providers Per Data Category

**Impact: MEDIUM (the best sensor wins for each kind of data)**

Users connect multiple sources (e.g. a phone platform plus a wearable), and the same day arrives from all of them. Pick data deterministically with an explicit provider ranking: a per-category override list checked first, falling back to a default list, with unlisted providers ranked last and ties broken by recency. Rank by sensor quality for that category, not by brand: rings and bands excel at sleep, GPS sport watches at activities, smart scales at body composition, food-logging apps at nutrition.

A battle-tested default order (dedicated health wearables, then multi-sport watches, then phone/platform sources):

```
OURA, WHOOP, GARMIN, FITBIT, APPLE, POLAR, COROS, SUUNTO,
SAMSUNG, HEALTH_CONNECT, WITHINGS, ULTRAHUMAN, BIOSTRAP, HUAWEI,
GOOGLEFIT, GOOGLE, ZEPP, WAHOO, SOMNOFY, AKTIIA, STRAVA,
PELOTON, CONCEPT2, ZWIFT, TRAININGPEAKS, MYFITNESSPAL, CRONOMETER
```

Per-category overrides and why:

| Category | Top providers (in order) | Rationale |
|---|---|---|
| sleep | OURA, WHOOP, GARMIN, FITBIT, APPLE, POLAR, SOMNOFY | Ring/band sensors excel at overnight temperature and HRV |
| activity | GARMIN, SUUNTO, POLAR, COROS, APPLE, WAHOO, STRAVA | GPS sport watches have the best workout and route data |
| daily | GARMIN, WHOOP, OURA, FITBIT, APPLE, POLAR, COROS | 24/7 wrist monitors are best for steps, HR, HRV |
| body | WITHINGS, OMRON, OMRONUS, INBODY, BODITRAX, GARMIN | Smart scales and BP monitors are purpose-built |
| nutrition | MYFITNESSPAL, CRONOMETER, FATSECRET, NUTRACHECK, MACROSFIRST | Only food-logging apps produce meaningful nutrition data |
| menstruation | FLO, CLUE, APPLE, FITBIT, OURA, SAMSUNG | Dedicated cycle apps have the best algorithms |

**Incorrect (implicit "most recent write wins"):**

```typescript
const daily = await latestDailyRow(userId, date); // whichever device synced last
```

**Correct (explicit category-aware resolution):**

```typescript
function providerRank(provider: string, category: Category): number {
  const override = CATEGORY_OVERRIDES[category];
  const inOverride = override?.indexOf(provider) ?? -1;
  if (inOverride !== -1) return inOverride;                    // overrides outrank all
  const inDefault = DEFAULT_ORDER.indexOf(provider);
  return inDefault !== -1 ? override.length + inDefault : Infinity;
}
```

Reference: [Integrations](https://docs.tryterra.co/reference)
