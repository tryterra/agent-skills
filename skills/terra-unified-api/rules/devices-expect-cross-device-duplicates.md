---
title: Expect Duplicate Data Across Connected Devices
impact: MEDIUM
impactDescription: natural keys cannot detect the same session from two devices
tags: multi-device, data, deduplication
---

## Expect Duplicate Data Across Connected Devices

**Impact: MEDIUM (natural keys cannot detect the same session from two devices)**

Users connect multiple sources (a phone platform plus one or more wearables), and each connection delivers independently. The same calendar day arrives as one daily row per connection, and the same workout or night of sleep arrives once per device that recorded it, each with a DIFFERENT `summary_id`. Natural-key upserts (see `data-natural-keys`) keep each provider's stream idempotent, but they cannot detect that two records from different providers describe the same real-world session. If you display merged data, your application needs an explicit selection or merge policy.

Which source to prefer, whether to combine metrics from several devices, and how to present conflicts are product decisions that depend on your use case; Terra API does not prescribe them. Common techniques include ranking sources per data category, filling missing metrics from other sources, and treating same-type records with heavily overlapping time ranges as one session, but choose deliberately for your product.

**Incorrect (assuming natural keys already deduplicated everything):**

```typescript
// One user, Garmin + Apple Health connected, both recorded the same run
const activities = await allActivities(userId, date);
render(activities); // the run renders twice - different summary_ids,
// so the upsert kept both, correctly
```

**Correct (store everything, merge behind an explicit policy):**

```typescript
// Storage stays per-connection and idempotent (one row per summary_id).
// Display goes through a deliberate policy your product owns:
const activities = await allActivities(userId, date);
render(mergeForDisplay(activities)); // your policy: pick, combine, or show all
```

Reference: [Data models](https://docs.tryterra.co/reference/health-and-fitness-api/data-models)
