# Vantage API Endpoint Routing

Which endpoint does what, and where to fetch the current request/response schema. Base URLs: `https://vantage.tryterra.co` (production), `https://vantage-sandbox.tryterra.co` (sandbox). All endpoints use HTTP Basic auth (`Authorization: Basic <base64(CLIENT_ID:CLIENT_SECRET)>`). Errors follow the RFC 7807 problem-detail format.

For exact field lists, validation limits, and full request/response examples, fetch the live `.md` page in the table below (append nothing; the URLs are already markdown). Do not rely on remembered field names: the product is evolving and the live page is authoritative.

| Goal | Endpoint | Current schema (fetch when building the call) |
| ---- | -------- | --------------------------------------------- |
| List diagnostic categories | `GET /api/v1/products` | https://docs.tryterra.co/vantage-api-reference/core-resources/products.md |
| List products in a category | `GET /api/v1/products/{product_type_id}` | same page |
| List orderable variants | `GET /api/v1/products/{product_id}/variants` | same page |
| Place an order | `POST /api/v1/orders` | https://docs.tryterra.co/vantage-api-reference/core-resources/orders.md |
| Get order details | `GET /api/v1/orders/{order_id}` | same page |
| End-user kit activation (HTML form) | `GET /activate?kit_id=...` | https://docs.tryterra.co/vantage-api-reference/core-resources/activation.md |
| Submit activation details | `POST /activate/kit` | same page |
| Update/clear webhook URL | `PATCH /api/v1/clients/webhook-url` | https://docs.tryterra.co/vantage-api-reference/core-resources/clients.md |
| Fetch results (presigned URL) | `GET /api/v1/results/{order_item_id}` | https://docs.tryterra.co/vantage-api-reference/core-resources/results.md |
| Acknowledge results | `POST /api/v1/results/{order_item_id}/acknowledge` | same page |

A worked end-to-end ordering example lives at https://docs.tryterra.co/vantage-api-docs/getting-started/ordering-your-first-test.md

## Semantics the schema pages do not spell out

- **The catalog is three levels**: product types contain products, products contain variants. A variant is the exact item a recipient receives and the thing you order (`variant_id` + `quantity` per order item).
- **Send the address field matching `collection_type`**: `shipping_address` for `AT_HOME`, `requested_lab_address` for `GO_TO_LAB`. The resolved lab comes back as `confirmed_lab_address`.
- **`currency` is an ISO 4217 numeric code** (e.g. `840` = USD), not an alpha code; prices are integer cents.
- **`client_order_reference_id` is your own unique order identifier** – pick a scheme that lets you reconcile webhooks with your system.
- **New orders start at** `order_status: "order.payment_processing"` with each item at `results_status: "results.awaiting_sample"`; progress arrives via webhooks (see references/webhooks.md).
- **Path prefixes are inconsistent in the docs**: the reference pages abbreviate (`/orders`), but the real paths are under `/api/v1`. The exception is the end-user activation flow (`GET /activate`, `POST /activate/kit`), which is served without the `/api/v1` prefix and is distinct from the sandbox simulation endpoint `POST /api/v1/orders/activate?kit_id={supplier_item_id}`.
- **Legacy host note**: existing Terra API diagnostics customers may configure their webhook URL against the diagnostics host (`PATCH https://diagnostics-sandbox.tryterra.co/api/v1/clients/webhook-url`) using their existing credentials.
- **Webhook URLs must be HTTPS**; PATCH with an empty string clears the URL.
