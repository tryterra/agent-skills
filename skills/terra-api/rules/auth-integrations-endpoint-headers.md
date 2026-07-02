---
title: Fetch the Integrations Catalogue Without an API Key
impact: HIGH
impactDescription: sending both headers returns an empty catalogue
tags: auth, integrations, api
---

## Fetch the Integrations Catalogue Without an API Key

**Impact: HIGH (sending both headers returns an empty catalogue)**

The detailed integrations endpoint (`GET /integrations/detailed`, `detailedfetch` in the SDK) behaves differently depending on which headers you send. With `dev-id` alone it returns your dev-scoped catalogue: only the providers enabled for your account, with names, icons, and supported data types. With both `dev-id` and `x-api-key` it returns EMPTY. This is the opposite of the usual "more auth, more data" intuition and produces a baffling blank provider list. Keep two client configurations: an authenticated one (`dev-id` + `x-api-key`) for real API calls (auth URL generation, deauth, user info, data requests) and a keyless one (`dev-id` only) for the public catalogue.

**Incorrect (one fully-authenticated client for everything):**

```typescript
const client = new TerraClient({ devId: env.TERRA_DEV_ID, apiKey: env.TERRA_API_KEY });
const catalogue = await client.integrations.detailedfetch(); // empty result
```

**Correct (keyless client for the catalogue):**

```typescript
const client = new TerraClient({ devId: env.TERRA_DEV_ID, apiKey: env.TERRA_API_KEY });
const publicClient = new TerraClient({ devId: env.TERRA_DEV_ID }); // no API key

const catalogue = await publicClient.integrations.detailedfetch(); // enabled providers
const authUrl = await client.authentication.authenticateuser({ ... }); // authed calls
```

Reference: [API reference](https://docs.tryterra.co/reference)
