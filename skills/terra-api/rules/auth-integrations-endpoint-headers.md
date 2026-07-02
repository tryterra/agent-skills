---
title: Send dev-id When Fetching the Integrations Catalogue
impact: HIGH
impactDescription: without dev-id you get every provider, not your enabled set
tags: auth, integrations, api
---

## Send dev-id When Fetching the Integrations Catalogue

**Impact: HIGH (without dev-id you get every provider, not your enabled set)**

The detailed integrations endpoint (`GET /integrations/detailed`, `detailedfetch` in the SDK) is public: it requires no API key and reads only the `dev-id` header. With `dev-id` it returns your dev-scoped catalogue – only the providers enabled for your account, with names, icons, supported scopes, and data types. Without `dev-id` it returns the full list of every provider Terra API supports, all marked active. That full list looks plausible, so a connect screen built from it silently offers providers your users cannot actually connect. Always send `dev-id`; sending `x-api-key` as well is harmless but unnecessary on this endpoint.

**Incorrect (no dev-id, e.g. a plain browser fetch):**

```typescript
// Public endpoint, so this "works" – but returns EVERY provider
// Terra API supports, not the ones enabled for your account.
const catalogue = await fetch("https://api.tryterra.co/v2/integrations/detailed")
  .then((r) => r.json());
renderConnectScreen(catalogue.providers); // offers providers users can't connect
```

**Correct (dev-id header scopes the catalogue to your account):**

```typescript
const catalogue = await fetch("https://api.tryterra.co/v2/integrations/detailed", {
  headers: { "dev-id": env.TERRA_DEV_ID },
}).then((r) => r.json()); // only providers enabled for your dev account
```

Reference: fetch the docs index at [docs.tryterra.co/llms.txt](https://docs.tryterra.co/llms.txt) to locate the current integrations endpoint reference when building the request or parsing the response.
