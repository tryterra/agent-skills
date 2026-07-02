# Vantage API Webhooks

Terra API pushes order and result progress to the webhook URL you configure at onboarding (updatable via `PATCH /api/v1/clients/webhook-url`). Sandbox and production deliver the same webhooks; sandbox payloads additionally carry a `supplier_item_id` field. Source: [webhooks](https://docs.tryterra.co/vantage-api-docs/documentation/webhooks).

## Event Types

There are two `event_type` families:

- **`order.status_changed`** – order-level fulfillment progress.
- **`order_item.results_status_change`** – per-item results progress.

Every payload carries `event_id` and `timestamp` in addition to the fields below. Deduplicate on `event_id`.

### Fulfillment events (`event_type: "order.status_changed"`)

`fulfillment.payment_processing` is the default state returned when the order is placed; it is not delivered as a separate webhook.

**`fulfillment.payment_complete`** – payment confirmed.

```json
{
  "event_type": "order.status_changed",
  "data": { "order_id": 249956252111773696, "status": "fulfillment.payment_complete" }
}
```

**`fulfillment.delivery_fulfilled`** – delivery details / tracking available. Adds `tracking_number`.

```json
{
  "event_type": "order.status_changed",
  "data": {
    "order_id": 249956252111773696,
    "status": "fulfillment.delivery_fulfilled",
    "tracking_number": "KnD3d5PMZyq5ulNcWkrq"
  }
}
```

### Results events (`event_type: "order_item.results_status_change"`)

These carry `order_id`, `order_item_id`, `results_status`, `variant_id`, and a `test_taker` object (`id`, `email`, `name`, `phone`, `country_code`), plus `event_id` and `timestamp`.

| `results_status`                     | When it fires                                          | Extra fields |
| ------------------------------------ | ------------------------------------------------------ | ------------ |
| `results.kit_activated`              | End user activates the kit (two-step activation suppliers only) | – |
| `results.sample_processing_in_lab`   | Lab confirms receipt of the sample                     | – |
| `results.results_ready`              | Lab confirms results are available                     | – |
| `results.sample_rejected`            | Lab rejects the sample                                 | `failure_cause` (e.g. `"blood contaminated"`) |
| `results.escalation_raised`          | An escalation is raised on a result set                | `escalation_level` (e.g. `"medium"`; maximum `escalation_level.very_high`) |

Result-status lifecycle for an item:

```
results.awaiting_sample -> results.kit_activated -> results.sample_processing_in_lab -> results.results_ready
                                                                         \-> results.sample_rejected
                                                                         \-> results.escalation_raised
```

`results.awaiting_sample` is the initial per-item status set at order creation. `results.kit_activated` only appears for suppliers whose kits require end-user activation.

## Signature Verification

Webhooks are signed with HMAC-SHA256. Verify every request before trusting the body.

- **Header:** `X-Terra-Signature`, formatted `t=<timestamp>,v1=<hex_signature>`, where `t` is a Unix timestamp in milliseconds and `v1` is the hex HMAC-SHA256 signature.
- **Additional headers:** `X-Terra-Trace-Id` (unique request ID for debugging) and `Content-Type: application/json`.

Verification steps:

1. Extract the `X-Terra-Signature` header and parse `t` (timestamp) and `v1` (signature).
2. Reject if `t` is outside a 5-minute tolerance (300,000 milliseconds) of now.
3. Construct the signed string as `"{timestamp}.{raw_body}"` using the raw request body.
4. Compute the expected HMAC-SHA256 with your signing secret.
5. Compare `v1` to the expected signature using a constant-time comparison.

The docs do not specify retry or redelivery behavior for failed deliveries.
