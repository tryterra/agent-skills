---
title: Handle Every Auth Event Type
impact: HIGH
impactDescription: missed lifecycle events leave zombie connections
tags: auth, event-types, connections
---

## Handle Every Auth Event Type

**Impact: HIGH (missed lifecycle events leave zombie connections)**

Connection state changes arrive as webhooks, and there are eight auth-flow event types, not one. Handling only `auth` and `deauth` leaves connections showing "active" after the provider revoked access, breaks silently when Terra API rotates the user ID on reauth, and never updates scopes. Key all updates on a unique constraint over the Terra user ID so handlers are idempotent upserts.

| Event | What to do |
|---|---|
| `auth` / `auth_success` | Upsert connection with status `active`, set provider and scopes |
| `auth_failed` | Log it; the user did not complete provider auth, no connection exists |
| `deauth` | Mark connection `revoked` |
| `access_revoked` | Same as `deauth` (the provider revoked access on its side) |
| `user_reauth` | Swap the old Terra user ID for the new one (see `auth-reauth-id-swap`) |
| `connection_error` | Mark connection `error` (provider returned 401/403/412) |
| `permission_change` | Update the stored scopes |

**Incorrect (only the happy path):**

```typescript
if (event.type === "auth") await createConnection(event);
if (event.type === "deauth") await deleteConnection(event);
// auth_failed, access_revoked, user_reauth, connection_error,
// permission_change: ignored
```

**Correct (exhaustive, idempotent upserts on the Terra user ID):**

```typescript
switch (event.type) {
  case "auth":
  case "auth_success":      return upsertConnection(terraUserId, { status: "active", provider, scopes });
  case "auth_failed":       return console.log(`terra auth failed for ${event.reference_id}`);
  case "deauth":
  case "access_revoked":    return upsertConnection(terraUserId, { status: "revoked" });
  case "user_reauth":       return swapTerraUserId(event.old_user.user_id, event.new_user.user_id);
  case "connection_error":  return upsertConnection(terraUserId, { status: "error" });
  case "permission_change": return upsertConnection(terraUserId, { scopes: parseScopes(event.granted_scopes) });
}
```

Reference: [Event types](https://docs.tryterra.co/reference/health-and-fitness-api/event-types)
