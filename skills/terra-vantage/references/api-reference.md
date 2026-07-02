# Vantage API Reference: Core Resources

Full endpoint reference for the Terra Vantage API. Base URLs are `https://vantage.tryterra.co` (production) and `https://vantage-sandbox.tryterra.co` (sandbox). All endpoints use HTTP Basic authentication (`Authorization: Basic <base64(CLIENT_ID:CLIENT_SECRET)>`). Paths are shown under the `/api/v1` prefix; some live reference pages abbreviate them (for example `/orders`). Error responses follow the RFC 7807 problem-detail format with `detail`, `instance`, `status`, `title`, and `type` fields.

Sources: [products](https://docs.tryterra.co/vantage-api-reference/core-resources/products), [orders](https://docs.tryterra.co/vantage-api-reference/core-resources/orders), [activation](https://docs.tryterra.co/vantage-api-reference/core-resources/activation), [clients](https://docs.tryterra.co/vantage-api-reference/core-resources/clients), [ordering your first test](https://docs.tryterra.co/vantage-api-docs/getting-started/ordering-your-first-test).

## Products

The catalog is three levels: product types contain products, products contain variants. A variant is the exact item a recipient receives and the thing you order.

| Method | Path                             | Description                                              |
| ------ | -------------------------------- | ------------------------------------------------------- |
| GET    | `/api/v1/products`               | List all product types (diagnostic categories)          |
| GET    | `/api/v1/products/{id}`          | List products within a product type (`id` = product type ID) |
| GET    | `/api/v1/products/{id}/variants` | List variants of a product (`id` = product ID)          |

Path `id` params are integers with minimum 1. Status codes: `200` success, `400` invalid format, `401` unauthorized, `404` not found, `500` server error (the top-level list returns `200`/`401`/`500`).

**ProductType** fields: `id`, `name`, `description`.

**Product** fields: `id`, `name`, `description`, `productTypeID`, `supplierID`, `basePriceCents`, `currency`, `availability`, `images`, `modelDescriptiveAttrs`, `variants`.

**ProductVariant** fields: `id`, `variantName`, `productID`, `productTypeID`, `supplierID`, `priceCents`, `currency`, `variantAvailability`, `productExternalSKU`, `variantDefiningAttrs`, `descriptiveAttrsOverride`, `availableCollectionTypes`, `images`.

**Image** fields: `id`, `url`, `altText`, `displayOrder`, `width`, `height`, `productID`, `variantID`.

`currency` is an ISO 4217 numeric code (for example `840` = USD). `availableCollectionTypes` lists which collection methods (`AT_HOME`, `GO_TO_LAB`) the variant supports.

## Orders

| Method | Path                    | Description                                             |
| ------ | ----------------------- | ------------------------------------------------------ |
| POST   | `/api/v1/orders`        | Create a new blood, DNA, or device test order          |
| GET    | `/api/v1/orders/{orderID}` | Get complete order details (items, recipient, status) |

`orderID` is an integer, minimum 1. Create returns `201`; validation error `400`; server error `500`. Get returns `200`; `400` invalid format, `401` unauthorized, `404` not found, `500` server error.

### Create order request body

Required:

- `client_order_reference_id` (string, 1 to 100 chars): your own unique order identifier.
- `collection_type` (string): `AT_HOME` or `GO_TO_LAB`.
- `items` (array, min 1): each item needs `variant_id` (string, min 1 char) and `quantity` (integer, 1 to 100).
- `recipient` (object): the person the test is for.

Optional (send the one matching `collection_type`):

- `shipping_address` (for `AT_HOME`).
- `requested_lab_address` (for `GO_TO_LAB`).

**recipient (RecipientDTO)** required fields: `first_name`, `last_name` (max 50 chars), `email` (max 100 chars), `date_of_birth` (string), `country_code` (integer, dialing code), `phone_number` (integer), `gender_at_birth` (enum: `m`, `f`, `other`).

**Address** fields (seen across the docs): `address_line_1`, `address_line_2`, `city`, `administrative_area`, `postal_code`, `country_code` (ISO 3166-1 alpha-2 string). Example order body:

```json
{
  "client_order_reference_id": "TEST-ORDER-001",
  "collection_type": "AT_HOME",
  "recipient": {
    "first_name": "John",
    "last_name": "Smith",
    "email": "john.smith@example.com",
    "phone_number": 4155551234,
    "country_code": 1,
    "date_of_birth": "1995-10-10",
    "gender_at_birth": "m"
  },
  "shipping_address": {
    "address_line_1": "123 Market Street",
    "city": "San Francisco",
    "administrative_area": "CA",
    "country_code": "US",
    "postal_code": "94102"
  },
  "items": [{ "variant_id": 100041, "quantity": 1 }]
}
```

### Create order response (201)

Fields: `order_id`, `order_status`, `recipient_id`, `tracking_number`, `estimated_delivery`, `confirmed_lab_address`, and `order_items` (array of OrderItemResponse). A newly created order reports `order_status: "order.payment_processing"`, and each item reports `results_status: "results.awaiting_sample"`.

```json
{
  "order_id": 251285377984405504,
  "recipient_id": 251285377984405505,
  "order_items": [{
    "order_id": 251285377984405504,
    "order_item_id": 251285377984405507,
    "variant_id": 100021,
    "product_type_id": 1,
    "price_per_item_cents": 4999,
    "quantity": 1,
    "currency": 840,
    "results_status": "results.awaiting_sample"
  }],
  "order_status": "order.payment_processing"
}
```

**OrderItemResponse** fields: `order_item_id`, `order_id`, `product_type_id`, `variant_id`, `quantity`, `price_per_item_cents`, `currency`, `item_status`, `lab_tracking_number`, `results_status`.

### Get order response (200)

Fields: `order_id`, `client_order_reference_id`, `order_status`, `collection_type`, `recipient`, `items`, `shipping_address`, `requested_lab_address`, `confirmed_lab_address`, `order_financials` (includes `currency`, `total_cents`, `discount_cents`), `client_id`, `supplier_id`.

## Activation

Kit activation is end-user facing, for suppliers that require the recipient to activate the kit (for example scanning a QR code) before lab processing.

| Method | Path             | Description                                                  |
| ------ | ---------------- | ----------------------------------------------------------- |
| GET    | `/activate`      | Serves an HTML activation form for the end user (`kit_id` query param, the supplier kit ID from the packaging) |
| POST   | `/activate/kit`  | Registers test-taker details with the supplier and updates the order item status |

`GET /activate` returns `200` (HTML, `text/html`), `400` invalid kit ID, `500` server error.

`POST /activate/kit` request body (`orders.ActivationContextDTO`, JSON):

- `supplier_kit_id` (string).
- `address` (required): `address_line_1` (1 to 100 chars, required), `address_line_2` (max 100), `city` (1 to 50, required), `administrative_area` (max 50, required), `postal_code` (required), `country_code` (ISO 3166-1 alpha-2, required).
- `recipient` (required): `first_name`, `last_name` (strings), `date_of_birth` (required), `email` (required), `phone_number` (integer, required), `gender_at_birth` (enum `m`, `f`, `other`, required), `country_code` (integer, required).
- `collection_date` (string).

Response `200` (`orders.ActivateKitResponse`: `kit_id`, `message`, `success` boolean). Errors: `400` invalid request or kit already activated, `404` kit not found, `409` kit already activated, `500` server error, `503` supplier service unavailable.

A successful activation emits a `results.kit_activated` webhook. In the sandbox you simulate activation instead via `POST /api/v1/orders/activate?kit_id={supplier_item_id}` (see the webhooks reference and the sandbox section of SKILL.md).

## Clients (webhook configuration)

| Method | Path                          | Description                                     |
| ------ | ----------------------------- | ----------------------------------------------- |
| PATCH  | `/api/v1/clients/webhook-url` | Update or clear the authenticated client's webhook URL |

Request body (`UpdateWebhookUrlRequest`): `webhook_url` (string) is the new URL, or an empty string to clear it. The URL must use HTTPS if provided.

Response `200` (`ClientResponse`): `client_id`, `customer_id`, `webhook_url`. Errors: `400` invalid URL or validation failure, `401` unauthorized (invalid client credentials), `404` client not found, `500` server error.

Existing Terra API diagnostics customers may configure the same webhook URL using their existing testing credentials against the diagnostics host, for example `PATCH https://diagnostics-sandbox.tryterra.co/api/v1/clients/webhook-url` with `Authorization: Basic` and a `webhook_url` body.
