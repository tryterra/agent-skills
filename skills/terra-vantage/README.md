# terra-vantage

Order at-home and go-to-lab diagnostic tests and deliver results with the [Terra API](https://tryterra.co) Vantage API. Vantage is a platform for managing blood test and DNA diagnostic products, processing orders, and delivering test results in FHIR format, so healthcare providers, laboratories, and partners can embed diagnostic testing into their own applications while Terra API handles kit suppliers, logistics, compliance, and results standardization.

Availability is currently the United Kingdom and the USA (Germany, Spain, and France coming soon), and onboarding is manual: contact Terra API for credentials (see [Account Setup and API Keys](https://docs.tryterra.co/vantage-api-docs/account-setup-and-api-keys)). Credentials work in the sandbox first, with production credentials issued later.

This skill covers the product-to-order-to-results workflow, HTTP Basic authentication, the `AT_HOME` vs `GO_TO_LAB` collection methods, kit activation, webhook events with HMAC signature verification, the mandatory results-acknowledgment step, and the sandbox environment. Facts are drawn from the Terra Vantage API documentation.

## Installation

```bash
npx skills add tryterra/agent-skills --skill terra-vantage
```

Or manually for Claude Code:

```bash
cp -r skills/terra-vantage ~/.claude/skills/
```

## Contents

| File                            | What it covers                                                                                       |
| ------------------------------- | ---------------------------------------------------------------------------------------------------- |
| `SKILL.md`                      | Product intro, availability and onboarding, Basic auth, the order-to-results workflow, collection methods, kit activation, the mandatory acknowledgment step, webhooks, sandbox, and gotchas |
| `references/api-reference.md`   | Full endpoint reference for products, orders, activation, and clients, with request/response shapes and the products data model |
| `references/webhooks.md`        | Every webhook event type and payload, the results-status lifecycle, and HMAC-SHA256 signature verification |
| `references/results.md`         | Fetching FHIR results via presigned URL, the FHIR Bundle structure, and the mandatory acknowledgment requirement |

## Highlights

- Three-level catalog (product types, products, variants); order a variant with `POST /api/v1/orders`
- HTTP Basic auth with a base64 `CLIENT_ID:CLIENT_SECRET`, not the `dev-id`/`x-api-key` used by other Terra API products
- `AT_HOME` (self-collection, `shipping_address`) vs `GO_TO_LAB` (mobile phlebotomy, `requested_lab_address`)
- Acknowledging results is **mandatory**: patients cannot see results until acknowledged, and skipping it transfers liability to you
- Webhooks are HMAC-SHA256 signed via `X-Terra-Signature`; results download as a FHIR Bundle from a 15-minute presigned URL
- The sandbox mirrors production webhooks and lets you simulate kit activation and auto-generate results

Full documentation: [docs.tryterra.co/vantage-api-docs/readme](https://docs.tryterra.co/vantage-api-docs/readme).
