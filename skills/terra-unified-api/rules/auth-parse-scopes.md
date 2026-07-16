---
title: Parse Scopes From the Comma-Separated Strings
impact: HIGH
tags: auth, scopes
---

## Parse Scopes From the Comma-Separated Strings

**Impact: HIGH**

Scopes arrive in different fields depending on the payload, and none of them is `granted_scopes`. On `auth` events (and on data payloads), the current scopes are the comma-separated string `user.scopes`, e.g. `"fitness.activity.read,fitness.sleep.read"`. On `permission_change` events the change arrives as deltas: `scopes_added` and `scopes_removed`, each a comma-separated string. The exception is the V3 `connection` object, which delivers `scopes` as a JSON array already. Parse the comma-separated strings into arrays before storing (guarding against null, empty, and whitespace-padded input), and apply the `permission_change` deltas; if you only capture scopes at first auth, later permission changes silently diverge from what you show the user.

**Incorrect (imagined field, assumed array, set once):**

```typescript
case "auth":
  await upsertConnection(terraUserId, { scopes: event.granted_scopes });
// granted_scopes does not exist; the real fields are user.scopes (auth)
// and scopes_added / scopes_removed (permission_change), all
// comma-separated strings - and this never updates on permission_change
```

**Correct (parse defensively, apply permission_change deltas):**

```typescript
function parseScopes(raw: string | null | undefined): string[] {
  if (!raw) return [];
  return raw.split(",").map((s) => s.trim()).filter(Boolean);
}

case "auth":
  await upsertConnection(terraUserId, { scopes: parseScopes(event.user?.scopes) });
  break;
case "permission_change":
  await applyScopeDelta(
    terraUserId,
    parseScopes(event.scopes_added),
    parseScopes(event.scopes_removed),
  );
  break;
```

Reference: [Event types](https://docs.tryterra.co/reference/health-and-fitness-api/event-types)
