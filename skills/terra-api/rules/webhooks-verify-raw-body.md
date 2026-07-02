---
title: Verify Signatures Over the Raw Request Body
impact: CRITICAL
impactDescription: unverified webhooks accept forged health data
tags: webhooks, security, signature
---

## Verify Signatures Over the Raw Request Body

**Impact: CRITICAL (unverified webhooks accept forged health data)**

Every Terra API webhook carries an `X-Terra-Signature` header (read it case-insensitively; a deprecated legacy duplicate named `Terra-Signature` is still sent today but is slated for removal, so verify against `X-Terra-Signature`) in the form `t=<timestamp>,v1=<hmac>`. The HMAC is computed with HMAC-SHA256 over `<timestamp>.<raw body>` using your signing secret (a separate credential from your API key). Verification must use the raw, unaltered request bytes and run BEFORE any JSON parsing. Body-parsing middleware silently breaks this: `JSON.stringify(parsedBody)` is not byte-identical to what Terra API signed (key order, whitespace, number formatting), so verification fails intermittently or gets disabled "because it doesn't work". Reject missing or invalid signatures with 401, and use a constant-time comparison.

**Incorrect (verifying a re-serialized body after middleware parsed it):**

```typescript
app.post("/api/terra/webhook", async (req, res) => {
  // body-parser already consumed the stream and parsed JSON
  const body = JSON.stringify(req.body); // NOT the bytes Terra API signed
  if (!verifyTerraWebhookSignature(req.headers["x-terra-signature"], body, secret)) {
    return res.status(401).end();
  }
  await handleEvent(req.body);
  res.status(200).end();
});
```

**Correct (raw body first, parse only after verification):**

```typescript
app.post("/api/terra/webhook", async (c) => {
  const rawBody = await c.req.text(); // raw, unaltered bytes
  const signature = c.req.header("x-terra-signature"); // header lookups are case-insensitive
  if (!signature || !verifyTerraWebhookSignature(signature, rawBody, env.TERRA_SIGNING_SECRET)) {
    return c.text("invalid signature", 401);
  }
  const event = JSON.parse(rawBody); // parse only after the signature checks out
  await handleEvent(event);
  return c.text("ok", 200);
});
```

The `terra-api` SDK ships `verifyTerraWebhookSignature()`; prefer it over hand-rolled HMAC code.

Reference: [Webhooks](https://docs.tryterra.co/health-and-fitness-api/integration-setup/setting-up-data-destinations/webhooks)
