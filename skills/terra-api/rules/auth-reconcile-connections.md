---
title: Reconcile Connection State, Never Trust Webhooks Alone
impact: HIGH
impactDescription: missed webhooks otherwise diverge your DB from reality
tags: auth, reliability, sync
---

## Reconcile Connection State, Never Trust Webhooks Alone

**Impact: HIGH (missed webhooks otherwise diverge your DB from reality)**

Webhooks are the primary real-time channel, but deliveries can be missed: network issues, a dev environment without tunnelling, provider-side delivery failures. Complement them with an idempotent reconciliation function that fetches verified state from Terra API and converges your database to it, regardless of what webhooks did or did not arrive. Reconciliation and the webhook handler must reach the same end state in any execution order, which they do when both are upserts keyed on the Terra user ID.

The reconciliation contract:

1. Call `client.user.getinfoforuserid({ reference_id: appUserId })` for verified connection data.
2. Upsert each returned Terra user as `active` or `revoked` based on its `active` flag.
3. Mark any stored connection Terra API did not return as `revoked` (it no longer exists upstream).

Run it at three triggers: page mount on connection-management screens (catch-up since last visit), on the `?auth=success` redirect (the auth webhook may not have landed yet), and on a schedule, e.g. every 6 hours, sweeping all users with active connections and isolating per-user failures so one bad user does not stop the sweep.

**Incorrect (webhooks are the only source of connection state):**

```typescript
// If the auth webhook was missed, the user connected a device
// but your app shows nothing - forever
```

**Correct (idempotent sync, safe to run any number of times):**

```typescript
async function syncTerraConnections(appUserId: string) {
  const info = await client.user.getinfoforuserid({ reference_id: appUserId });
  const seen = new Set<string>();
  for (const u of info.users ?? []) {
    seen.add(u.user_id);
    await upsertConnection(u.user_id, {
      status: u.active ? "active" : "revoked",
      provider: u.provider,
    });
  }
  await revokeConnectionsNotIn(appUserId, seen); // stale rows Terra API no longer knows
}
```

Reference: [Getting started](https://docs.tryterra.co/health-and-fitness-api/getting-started)
