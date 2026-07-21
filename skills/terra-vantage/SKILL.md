---
name: terra-vantage
description: Order at-home and go-to-lab diagnostic tests and deliver results with the Terra Vantage API. Use when ordering blood tests or DNA tests, integrating at-home test kits, placing diagnostics orders, browsing test products and variants, handling kit activation, simulating order lifecycles in sandbox, tracking fulfillment and shipping, receiving results-status webhooks, fetching FHIR-format lab results, or acknowledging results (a mandatory compliance step before patients can view them). Covers the product-to-order-to-results workflow, authentication (Terra dev-id/API key via HTTP Basic or headers), the AT_HOME vs GO_TO_LAB collection methods, webhook events and HMAC signature verification, delivery debugging, the sandbox environment, and the manual partner onboarding required to get started.
license: MIT
compatibility: Requires network access to docs.tryterra.co for current endpoint schemas
metadata:
  author: terra
  version: "1.1.0"
---

# Terra Vantage API

The Vantage API is a platform for managing blood test and DNA diagnostic products, processing orders, and delivering test results. It lets healthcare providers, laboratories, and partners embed diagnostic testing directly into their own applications while Terra API handles the operational complexity: kit supplier integrations (no minimum order requirements), logistics and shipping, compliance, and results standardization into FHIR format.

**Availability and onboarding.** Vantage is available in the United Kingdom and the USA, with Germany, Spain, and France listed as coming soon. Onboarding is manual, not self-service: contact Terra API to have your credentials enabled (see [Account setup](https://docs.tryterra.co/vantage-api-docs/account-setup-and-api-keys)). Access is sandbox-first; production is enabled separately when you go live.

## Authentication

Vantage uses your standard **Terra API credentials** (the `dev-id` and API key from the Terra dashboard – the same pair as every other Terra API product), presented either way on every authenticated endpoint:

1. **HTTP Basic** (what the docs show): username = `dev-id`, password = API key, i.e. `Authorization: Basic base64(DEV_ID:API_KEY)`. Older docs called these `CLIENT_ID`/`CLIENT_SECRET` – same values.
2. **Header pair**: `dev-id: <id>` + `x-api-key: <key>`.

`401` = wrong/unknown credential; `403` = suspended account, missing Vantage access, ordering a catalog-disabled product, or calling the simulate endpoint in production.

Base URLs (all API paths below are under `/api/v1`):

| Environment | Base URL                              |
| ----------- | ------------------------------------- |
| Production  | `https://vantage.tryterra.co`         |
| Sandbox     | `https://vantage-sandbox.tryterra.co` |

## Order-to-Results Workflow

An integration walks a test from catalog to acknowledged result. Products are a three-level catalog (**product types** hold **products**, which hold **variants**), and a variant is the exact thing a recipient receives.

```
1  GET  /api/v1/products                       -> list product types (e.g. Blood Test)
2  GET  /api/v1/products/{product_type_id}     -> products within a type
3  GET  /api/v1/products/{product_id}/variants -> variants of a product
4  POST /api/v1/orders                         -> place order (variant_id + quantity + recipient)
5  (webhooks)                                  -> fulfillment + results status changes
6  GET  /api/v1/results/{order_item_id}?test_taker_id= -> presigned FHIR download URL
7  POST /api/v1/results/{order_item_id}/acknowledge?test_taker_id= -> MANDATORY, user-triggered
```

Placing an order returns `201` with an `order_id`, a `recipient_id`, and one `order_item_id` per item. New orders start at `order_status: "order.payment_processing"` and each item at `results_status: "results.awaiting_sample"`. Track everything downstream by `order_item_id`, since results, activation, and acknowledgment are all per-item.

[references/api-reference.md](references/api-reference.md) maps each goal to its endpoint (including the order/results indexes, lab lookup, catalog curation, and the monitoring endpoints) and to the live doc page carrying the current request/response schema; read it before implementing any endpoint call, and fetch the linked `.md` page when building a request body.

## Collection Methods

Each order sets a `collection_type` that determines how the sample is taken and which address field applies:

| `collection_type` | Meaning                                                                         | Address field           |
| ----------------- | ------------------------------------------------------------------------------- | ----------------------- |
| `AT_HOME`         | Kit shipped to the recipient; they self-collect and follow the kit instructions | `shipping_address`      |
| `GO_TO_LAB`       | Sample drawn at a lab draw site (Patient Service Center)                        | `requested_lab_address` |

For `GO_TO_LAB`, the requested lab address is used as a proxy to route the order to the closest available lab; the resolved lab comes back as `confirmed_lab_address`, and `GET /api/v1/labs?zip_code=` lists nearby draw sites (US) to offer the user beforehand. A variant advertises which methods it supports in `available_collection_types` (an array of the strings `"AT_HOME"`/`"GO_TO_LAB"`); confirm support before offering a method.

## Kit Activation

Some suppliers require the end user to activate the kit themselves (for example by scanning a QR code on the packaging) before the lab will process it. The QR code embeds `GET /api/v1/orders/activate?kit_id={supplier_item_id}`, which serves an HTML activation form; the form submits to `POST /api/v1/orders/activate` (JSON body, buildable programmatically if you own the UI). Both activation routes are unauthenticated. A successful activation emits a `results.kit_activated` webhook that carries the newly assigned **`test_taker_id` – capture it**; you need it for every results call.

## Acknowledging Results (Mandatory)

Acknowledging results is **not optional**. All results, from low to high clinical escalation, must be explicitly acknowledged before patients can access them, and the call must be triggered by an explicit end-user action (a button/checkbox after viewing) – never automatically by your backend on retrieval.

```
POST /api/v1/results/{order_item_id}/acknowledge?test_taker_id={id}
```

Two consequences are called out for leaving results unacknowledged:

- **Liability transfers to you.** Failure to acknowledge "initiates a chain of liability that transfers responsibility directly to you," and your organization assumes full liability for adverse outcomes from delayed or unacknowledged results.
- **Suppliers may contact patients directly.** Escalated results carry an `acknowledgment_due_by` deadline; if results stay unacknowledged, test suppliers and medical teams are authorized to reach out to patients directly.

FHIR result structure and the fetch/acknowledge endpoints are detailed in [references/results.md](references/results.md); read it when building result retrieval or the acknowledgment step.

## Webhooks

Terra API delivers order and result progress to the HTTPS webhook URL registered per environment (`PATCH /api/v1/clients/webhook-url`; read back with `GET`). There are two `event_type` families: `order.status_changed` for fulfillment progress and `order_item.results_status_change` for per-item result progress. Webhooks are HMAC-SHA256 signed via the `X-Terra-Signature` header; verify every request before trusting it. Delivery is at-least-once with retries – dedupe on `event_id` and respond 2xx fast.

Every event type, its full payload, the status enums, signature verification, and retry/debugging semantics are in [references/webhooks.md](references/webhooks.md). Read it when building or verifying a webhook handler, or when deliveries seem to be missing.

## Working with the Sandbox

Two ways to drive a sandbox order through its lifecycle:

- **The simulate endpoint (preferred for tests).** `POST /api/v1/orders/{orderID}/simulate` with `{"event": "...", "order_item_id": "..."}` applies one lifecycle event exactly as a supplier update would – status history recorded AND the signed webhook delivered. Events: `payment_complete`, `payment_failed`, `processing`, `delayed`, `cancelled`, `delivery_fulfilled`, `completed`, `kit_activated`, `sample_processing_in_lab`, `sample_rejected`, `partial_results_ready`, `results_ready`, `lab_processing_error`, `escalation_raised`. Only valid forward transitions are accepted (`422` otherwise); `results_ready` also stores a sample result so download/acknowledge work end to end. Returns `403` in production.
- **The simulated supplier flow.** The sandbox supplier progresses orders on timers: shipping webhooks arrive within a minute or so, then after kit activation the result webhooks follow at 1-2 minute intervals. Activation is a browser flow: open `https://vantage-sandbox.tryterra.co/api/v1/orders/activate?kit_id={supplier_item_id}` (the `supplier_item_id` arrives on the sandbox webhook) and complete the form. The happy path is deterministic (`results_ready`); use simulate to exercise rejections.

**Sandbox webhooks add `supplier_item_id`** in `order.status_changed` payloads; production payloads omit it (recover it from `GET /api/v1/orders/{orderID}` → `items[].supplier_item_id`).

## Gotchas

- **IDs are JSON strings.** `order_id`, `order_item_id`, `recipient_id`, `test_taker_id`, `variant_id` in order responses and webhooks are 64-bit snowflakes serialized as strings – never parse them as numbers (JavaScript corrupts them). Catalog reads (`/products*`) still return numeric `id` fields; order requests take `variant_id` as a string.
- **Two vocabularies for one fulfillment status.** REST reads render `order.*` (payment failure = `order.failed`); webhook payloads render `fulfillment.*` (payment failure = `fulfillment.payment_failed`). Results statuses (`results.*`) are identical on both. Match per surface.
- **Signature timestamp is Unix SECONDS.** `X-Terra-Signature: t=<unix_seconds>,v1=<hex>`; treating `t` as milliseconds makes every verification fail. Sign-check against the raw body.
- **`test_taker_id` is required to read or acknowledge results.** Both endpoints take it as a query parameter; it first appears on the `results.kit_activated` webhook.
- **Order creation is NOT idempotent.** `client_order_reference_id` is for reconciliation only – no server-side dedupe, so a blind retry creates a second order. On ambiguous failure, list recent orders and match your reference before retrying.
- **Acknowledgment gates patient access and shifts liability.** Must be an explicit end-user action.
- **Track by `order_item_id`, not `order_id`.** Results, activation, and acknowledgment are all per item.
- **Presigned result URLs expire in 15 minutes.** Re-fetch to re-mint rather than caching the URL.
- **Collection type dictates the address field.** `shipping_address` for `AT_HOME`, `requested_lab_address` for `GO_TO_LAB`.
- **Catalog curation blocks ordering.** `PUT /api/v1/products/selection` is a full-set write; curated-out products vanish from reads and ordering one returns `403`.
- **Sandbox and production hold separate webhook URLs**, and access is enabled per environment (sandbox first).

## Live Documentation

Append `.md` to any page URL for markdown. If the terra-docs MCP server (`https://docs.tryterra.co/~gitbook/mcp`) is connected, use its tools to search and fetch these pages instead.

- [What is Vantage API?](https://docs.tryterra.co/vantage-api-docs/readme)
- [Account setup and authentication](https://docs.tryterra.co/vantage-api-docs/account-setup-and-api-keys)
- [Core concepts](https://docs.tryterra.co/vantage-api-docs/core-concepts)
- [Ordering your first test](https://docs.tryterra.co/vantage-api-docs/getting-started/ordering-your-first-test)
- [Working with Sandbox](https://docs.tryterra.co/vantage-api-docs/getting-started/working-with-sandbox)
- [Webhooks](https://docs.tryterra.co/vantage-api-docs/documentation/webhooks)
- [Managing orders](https://docs.tryterra.co/vantage-api-docs/documentation/managing-orders)
- [Test Collection Methods](https://docs.tryterra.co/vantage-api-docs/documentation/test-collection-methods)
- [Results](https://docs.tryterra.co/vantage-api-docs/documentation/results)
- [Errors](https://docs.tryterra.co/vantage-api-docs/documentation/errors)
- [Monitoring and debugging](https://docs.tryterra.co/vantage-api-docs/documentation/monitoring)
- [Best practices](https://docs.tryterra.co/vantage-api-docs/documentation/best-practices)
- [Acknowledging Results](https://docs.tryterra.co/vantage-api-docs/important-information/acknowledging-results)
- [Going to production](https://docs.tryterra.co/vantage-api-docs/important-information/going-to-production)
- API reference: [activation](https://docs.tryterra.co/vantage-api-reference/core-resources/activation), [clients](https://docs.tryterra.co/vantage-api-reference/core-resources/clients), [orders](https://docs.tryterra.co/vantage-api-reference/core-resources/orders), [products](https://docs.tryterra.co/vantage-api-reference/core-resources/products), [results](https://docs.tryterra.co/vantage-api-reference/core-resources/results)
