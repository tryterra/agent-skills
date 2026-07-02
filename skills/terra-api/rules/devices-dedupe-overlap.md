---
title: Deduplicate Overlapping Sessions Across Devices
impact: MEDIUM
impactDescription: one workout should not appear twice in the timeline
tags: multi-device, merging, activities, sleep
---

## Deduplicate Overlapping Sessions Across Devices

**Impact: MEDIUM (one workout should not appear twice in the timeline)**

When two devices record the same run or the same night's sleep, both records arrive with different summary IDs, so key-based dedup cannot catch them. Detect them structurally: two records of the same type whose time ranges overlap by more than 80% are the same session. Keep the one from the higher-priority provider for that category (`activity` or `sleep`), and drop the other from the merged timeline (not from storage; keep both rows).

**Incorrect (merging timelines by key only):**

```typescript
const timeline = [...garminActivities, ...appleActivities]
  .sort(byStartTime); // the same run shows up twice
```

**Correct (overlap-based dedup, priority picks the survivor):**

```typescript
function overlapRatio(a: Session, b: Session): number {
  const start = Math.max(+a.startTime, +b.startTime);
  const end = Math.min(+a.endTime, +b.endTime);
  const overlap = Math.max(0, end - start);
  return overlap / Math.min(+a.endTime - +a.startTime, +b.endTime - +b.startTime);
}

function dedupe(sessions: Session[], category: Category): Session[] {
  const kept: Session[] = [];
  for (const s of sessions.sort(byPriority(category))) {
    const dup = kept.find(
      (k) => k.activityType === s.activityType && overlapRatio(k, s) > 0.8,
    );
    if (!dup) kept.push(s); // higher priority was seen first, so it survives
  }
  return kept.sort(byStartTime);
}
```

Reference: [Data models](https://docs.tryterra.co/reference/health-and-fitness-api/data-models)
