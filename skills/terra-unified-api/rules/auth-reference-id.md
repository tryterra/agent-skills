---
title: Pass Your User ID as reference_id
impact: HIGH
impactDescription: the join key between your users and Terra user records
tags: auth, users
---

## Pass Your User ID as reference_id

**Impact: HIGH (the join key between your users and Terra user records)**

When generating an auth link with `authenticateuser()` (or a widget session), set `reference_id` to your application's user ID. Terra API stores it on the Terra user record and returns it in every webhook and in user-info responses, making it the durable link between your users and their Terra user IDs. Without it, an incoming webhook only identifies a Terra user ID, and you have no reliable way to know which of your users it belongs to, especially after reauth events swap the Terra user ID.

**Incorrect (no reference_id, guessing ownership later):**

```typescript
const res = await client.authentication.authenticateuser({
  resource: "GARMIN",
  auth_success_redirect_url: successUrl,
  auth_failure_redirect_url: failureUrl,
}); // webhook arrives: whose data is this?
```

**Correct (reference_id ties Terra users to your users):**

```typescript
const res = await client.authentication.authenticateuser({
  resource: "GARMIN",
  reference_id: appUser.id, // your user's UUID
  auth_success_redirect_url: successUrl,
  auth_failure_redirect_url: failureUrl,
});
// every webhook for this connection now carries reference_id = appUser.id
```

Reference: [Getting started](https://docs.tryterra.co/health-and-fitness-api/getting-started)
