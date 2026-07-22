# Vantage API Endpoint Routing

Which endpoint does what, and where to fetch the current request/response schema. Base URLs: `https://vantage.tryterra.co` (production), `https://vantage-sandbox.tryterra.co` (sandbox). Auth: Terra dev-id/API key via HTTP Basic or the `dev-id`+`x-api-key` header pair (see SKILL.md). Errors follow the RFC 7807 problem-detail format; see the [Errors doc](https://docs.tryterra.co/vantage-api-docs/documentation/errors.md).

For exact field lists, validation limits, and full request/response examples, fetch the live `.md` page linked below. Do not rely on remembered field names: the product is evolving and the live page is authoritative.

| Goal                                  | Endpoint                                                          | Current schema (fetch when building the call)                                                                    |
| ------------------------------------- | ----------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------- |
| List diagnostic categories            | `GET /api/v1/products`                                            | https://docs.tryterra.co/vantage-api-reference/core-resources/products.md                                        |
| List products in a category           | `GET /api/v1/products/{product_type_id}`                          | same page (`?show_all=true` adds per-product `enabled` flags)                                                    |
| List orderable variants               | `GET /api/v1/products/{product_id}/variants`                      | same page                                                                                                        |
| Curate your catalog                   | `PUT /api/v1/products/selection`                                  | same page (full-set write; curated-out products are non-orderable, 403)                                          |
| Place an order                        | `POST /api/v1/orders` (201)                                       | https://docs.tryterra.co/vantage-api-reference/core-resources/orders.md                                          |
| Get order details + status history    | `GET /api/v1/orders/{order_id}`                                   | same page                                                                                                        |
| List/filter orders (keyset-paginated) | `GET /api/v1/orders`                                              | same page (`limit`, `cursor`, `since`, `status`, `collection_type`, `missing=true` for delivered-but-resultless) |
| Simulate a lifecycle event (non-prod) | `POST /api/v1/orders/{order_id}/simulate`                         | same page                                                                                                        |
| End-user kit activation (HTML form)   | `GET /api/v1/orders/activate?kit_id=...` (unauth)                 | https://docs.tryterra.co/vantage-api-reference/core-resources/activation.md                                      |
| Submit activation details             | `POST /api/v1/orders/activate` (unauth)                           | same page                                                                                                        |
| Nearby lab draw sites (GO_TO_LAB)     | `GET /api/v1/labs?zip_code=...`                                   | https://docs.tryterra.co/vantage-api-docs/documentation/test-collection-methods.md                               |
| Read/update webhook URL               | `GET`/`PATCH /api/v1/clients/webhook-url`                         | https://docs.tryterra.co/vantage-api-reference/core-resources/clients.md                                         |
| List result activity                  | `GET /api/v1/results` (`status`, `is_acknowledged` in rows)       | https://docs.tryterra.co/vantage-api-reference/core-resources/results.md                                         |
| Fetch results (presigned URL)         | `GET /api/v1/results/{order_item_id}?test_taker_id=`              | same page                                                                                                        |
| Acknowledge results                   | `POST /api/v1/results/{order_item_id}/acknowledge?test_taker_id=` | same page                                                                                                        |
| Account analytics summary             | `GET /api/v1/overview`                                            | https://docs.tryterra.co/vantage-api-docs/documentation/monitoring.md                                            |
| Webhook delivery outcomes             | `GET /api/v1/webhook-deliveries`                                  | same page (`outcome=failed` = rejected/invalid/dead_lettered)                                                    |

A worked end-to-end ordering example lives at https://docs.tryterra.co/vantage-api-docs/getting-started/ordering-your-first-test.md

## Semantics the schema pages do not spell out

- **The catalog is three levels**: product types contain products, products contain variants. A variant is the exact item a recipient receives and the thing you order (`variant_id` + `quantity` per order item). `available_collection_types` on a variant is an array of the strings `"AT_HOME"`/`"GO_TO_LAB"`.
- **Send the address field matching `collection_type`**: `shipping_address` for `AT_HOME`, `requested_lab_address` for `GO_TO_LAB`. The resolved lab comes back as `confirmed_lab_address`.
- **Gate the country before ordering**: each variant carries `supported_ship_to_countries` (ISO-3166 alpha-2). Orders outside it 400 with an `invalid_fields` entry tagged `unsupported_ship_to_country` on `shipping_address.country_code` / `requested_lab_address.country_code`, plus `supported_ship_to_countries` in the problem detail.
- **IDs are strings** in order responses and webhooks (64-bit snowflakes). Catalog reads return numeric ids, but the order request's `variant_id` is a string.
- **`currency` is an ISO 4217 numeric code** (`840` USD, `978` EUR, `826` GBP), prices are integer cents. `phone_number`/`country_code` accept quoted strings on input (preserves leading zeros; `phone_number` also accepts `+`-prefixed E.164) but return as integers. `gender_at_birth` is `male`|`female`.
- **`client_order_reference_id` is your reconciliation key, NOT an idempotency key** – creation is not deduplicated server-side; a retried create makes a second order.
- **New orders start at** `order_status: "order.payment_processing"` (REST vocabulary; `order.processing` is a later state, reached only after payment completes) with each item at `results_status: "results.awaiting_sample"`; progress arrives via webhooks (see references/webhooks.md).
- **Keyset pagination** on the index endpoints: pass the response's `next_cursor` as `?cursor=`; absence of `next_cursor` means last page. `limit` is 1-100 (default 25).
- **`GET /api/v1/orders/{order_id}` is the recovery path**: `status_history` (newest first, escalation entries carry `escalation_level` + `acknowledgment_due_by`), `items[].supplier_item_id`, and `items[].test_taker_ids` let you recover anything a missed webhook carried. Orders you don't own return 404.
- **Webhook URLs must be HTTPS**; PATCH with an empty string clears the URL. Sandbox and production hold separate URLs.
