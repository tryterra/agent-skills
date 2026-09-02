---
title: Mock at the SDK and Infrastructure Boundaries
impact: LOW-MEDIUM
tags: testing, mocks
---

## Mock at the SDK and Infrastructure Boundaries

**Impact: LOW-MEDIUM**

Test your Terra API integration logic without real network calls or a real database. Mock at three boundaries: the `terra-api` SDK module (client methods and `verifyTerraWebhookSignature` as configurable mock functions), your database client (chainable query-builder mocks), and background-task scheduling, which should be made eager (await the promise immediately) so async webhook processing runs synchronously inside the test. This keeps tests fast and deterministic while exercising all your extraction, upsert, and lifecycle logic for real.

**Incorrect (integration tests as the only coverage):**

```typescript
// Requires a live database, a tunnel, and a real device to generate
// webhooks - so event-type edge cases effectively never get tested
```

**Correct (module-level mocks, eager background tasks):**

```typescript
vi.mock("terra-api", () => ({
  TerraClient: vi.fn(() => mockClient),
  verifyTerraWebhookSignature: vi.fn(() => true), // per-test: false for 401 cases
}));

const executionCtx = {
  waitUntil: vi.fn((p: Promise<unknown>) => p), // eager: test awaits processing
};

it("marks the connection revoked on deauth", async () => {
  await handleEvent(deauthEvent, { db: mockDb, executionCtx });
  expect(mockDb.update).toHaveBeenCalledWith(
    expect.objectContaining({ status: "revoked" }),
  );
});
```

Reference: [Event types](https://docs.tryterra.co/reference/health-and-fitness-api/event-types)
