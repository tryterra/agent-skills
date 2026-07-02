---
title: Attribute Every Merged Value to Its Source
impact: MEDIUM
tags: multi-device, ui, providers
---

## Attribute Every Merged Value to Its Source

**Impact: MEDIUM**

Once values are merged across devices, users (and support engineers) need to know where each number came from: "why does my step count look low?" is unanswerable if the merge discarded provenance. Carry a `provider` field on every merged metric, activity, and score. In the UI, show source labels only when the user has 2+ active connections (a single-device user gains nothing from seeing their own device's name everywhere), and resolve raw provider codes (e.g. `GOOGLE_FIT`) to display names via the integrations catalogue endpoint rather than hardcoding a mapping.

**Incorrect (provenance discarded at merge time):**

```typescript
return { steps: firstNonNull("steps").value }; // which device said 4,000?
```

**Correct (provider travels with the value):**

```typescript
return {
  steps: firstNonNull("steps"),        // { value: 4000, provider: "GARMIN" }
  sleepDuration: bestSleep(rows),      // { value: 27900, provider: "OURA" }
};

// UI: label rendered only when multiple sources exist
{activeConnections.length >= 2 && <SourceBadge name={displayName(metric.provider)} />}
```

Reference: [Integrations](https://docs.tryterra.co/reference)
