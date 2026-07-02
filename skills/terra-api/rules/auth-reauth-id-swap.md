---
title: Swap Terra User IDs on user_reauth
impact: HIGH
impactDescription: unswapped IDs orphan the connection and its future data
tags: auth, users, connections
---

## Swap Terra User IDs on user_reauth

**Impact: HIGH (unswapped IDs orphan the connection and its future data)**

When a user re-authenticates with a provider they already connected, Terra API generates a NEW Terra user ID and sends a `user_reauth` event containing both the old and new IDs. All subsequent webhooks use the new ID. If you do not swap the ID on your stored connection, incoming data no longer matches any connection you know about ("unknown Terra user"), and the old connection sits active forever while receiving nothing.

**Incorrect (treating reauth as a fresh auth):**

```typescript
case "user_reauth":
  await createConnection(event.new_user.user_id); // duplicate connection;
  // the old row still looks active and future lookups are ambiguous
```

**Correct (swap old for new in place):**

```typescript
case "user_reauth":
  await db.execute(
    `UPDATE terra_connection
     SET terra_user_id = $1, updated_at = now()
     WHERE terra_user_id = $2`,
    [event.new_user.user_id, event.old_user.user_id],
  );
```

Historical data rows keyed by connection (not by Terra user ID) survive the swap untouched, which is another reason to anchor data tables to your own connection record.

Reference: [Event types](https://docs.tryterra.co/reference/health-and-fitness-api/event-types)
