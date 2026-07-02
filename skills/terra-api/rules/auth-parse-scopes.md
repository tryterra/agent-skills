---
title: Parse Scopes From the Comma-Separated String
impact: HIGH
tags: auth, scopes
---

## Parse Scopes From the Comma-Separated String

**Impact: HIGH**

Terra API delivers granted scopes as a single comma-separated string, e.g. `"fitness.activity.read,fitness.sleep.read"`. Parse it into an array before storing so you can query and display individual permissions, and guard against null, empty, and whitespace-padded input. Scopes are set on `auth` events and updated on `permission_change` events; if you only capture them at first auth, later permission changes silently diverge from what you show the user.

**Incorrect (storing the raw string, set once):**

```typescript
case "auth":
  await upsertConnection(terraUserId, { scopes: event.granted_scopes });
// "fitness.activity.read,fitness.sleep.read" stored as one opaque string,
// never updated on permission_change
```

**Correct (parse defensively, update on both events):**

```typescript
function parseScopes(raw: string | null | undefined): string[] {
  if (!raw) return [];
  return raw.split(",").map((s) => s.trim()).filter(Boolean);
}

case "auth":
case "permission_change":
  await upsertConnection(terraUserId, { scopes: parseScopes(event.granted_scopes) });
```

Reference: [Event types](https://docs.tryterra.co/reference/health-and-fitness-api/event-types)
