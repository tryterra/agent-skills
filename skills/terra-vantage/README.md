# terra-vantage

Order at-home and go-to-lab diagnostic tests and deliver results with the [Terra API](https://tryterra.co) Vantage API. Vantage is a platform for managing blood test and DNA diagnostic products, processing orders, and delivering test results in FHIR format, so healthcare providers, laboratories, and partners can embed diagnostic testing into their own applications while Terra API handles kit suppliers, logistics, compliance, and results standardization.

Availability is currently the United Kingdom and the USA (Germany, Spain, and France coming soon), and onboarding is manual: contact Terra API to have your credentials enabled (see [Account setup](https://docs.tryterra.co/vantage-api-docs/account-setup-and-api-keys)). Access is sandbox-first, with production enabled separately at go-live.

This skill covers the product-to-order-to-results workflow, authentication (Terra dev-id/API key via HTTP Basic or headers), the `AT_HOME` vs `GO_TO_LAB` collection methods, kit activation, webhook events with HMAC signature verification and retry semantics, sandbox lifecycle simulation, delivery debugging, and the mandatory results-acknowledgment step. Facts are drawn from the Terra Vantage API documentation.

## Installation

```bash
npx skills add tryterra/agent-skills --skill terra-vantage
```

Or manually for Claude Code:

```bash
cp -r skills/terra-vantage ~/.claude/skills/
```

## Contents

| File                          | What it covers                                                                                                                                                                                    |
| ----------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `SKILL.md`                    | Product intro, availability and onboarding, auth, the order-to-results workflow, collection methods, kit activation, the mandatory acknowledgment step, webhooks, sandbox simulation, and gotchas |
| `references/api-reference.md` | Goal-to-endpoint routing table (catalog, orders, simulate, labs, results, monitoring) with live schema links, plus semantics the schema pages omit                                                |
| `references/webhooks.md`      | Both webhook event families and payloads, the status vocabularies and lifecycles, HMAC-SHA256 signature verification, and retry/debugging semantics                                               |
| `references/results.md`       | Fetching FHIR results via presigned URL, the FHIR Bundle structure, and the mandatory user-triggered acknowledgment requirement                                                                   |

## Highlights

- Three-level catalog (product types, products, variants); order a variant with `POST /api/v1/orders`
- Auth is your standard Terra dev-id/API key – HTTP Basic (`dev-id` as username) or the `dev-id`/`x-api-key` header pair
- `AT_HOME` (self-collection, `shipping_address`) vs `GO_TO_LAB` (lab draw site, `requested_lab_address`, `GET /api/v1/labs` for nearby sites)
- Acknowledging results is **mandatory and user-triggered**: patients cannot see results until acknowledged, and skipping it transfers liability to you
- Webhooks are HMAC-SHA256 signed via `X-Terra-Signature` (timestamp in Unix seconds); at-least-once delivery – dedupe on `event_id`
- IDs in order responses and webhooks are JSON strings (64-bit snowflakes) – never parse as numbers
- `POST /api/v1/orders/{id}/simulate` drives any lifecycle event in sandbox, including failure paths; results download as a FHIR Bundle from a 15-minute presigned URL

Full documentation: [docs.tryterra.co/vantage-api-docs/readme](https://docs.tryterra.co/vantage-api-docs/readme).
