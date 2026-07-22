# Vantage API Webhooks

Terra API pushes order and result progress to the HTTPS webhook URL registered per environment (`PATCH /api/v1/clients/webhook-url`). Sandbox and production deliver the same webhooks; sandbox `order.status_changed` payloads additionally carry a `supplier_item_id` field. Source: [webhooks](https://docs.tryterra.co/vantage-api-docs/documentation/webhooks).

## Event Types

There are two `event_type` families:

- **`order.status_changed`** – order-level fulfillment progress.
- **`order_item.results_status_change`** – per-item results progress.

Every payload carries `event_id` (string) and `timestamp` (Unix seconds) in addition to the fields below. Delivery is at-least-once: **deduplicate on `event_id`**, which equals the `X-Terra-Trace-Id` header. All payload IDs – `event_id`, `order_id`, `order_item_id`, `variant_id`, `test_taker_id` – are JSON **strings**.

### Fulfillment events (`event_type: "order.status_changed"`)

`data`: `order_id` (string), `status`, plus `tracking_number` and (sandbox only) `supplier_item_id` when available. `status` values: `order.payment_processing`, `order.payment_complete`, `order.payment_failed`, `order.processing`, `order.delayed`, `order.delivery_fulfilled`, `order.completed`, `order.cancelled` - the same vocabulary REST serves.

REST reads of the same order use the identical vocabulary - match webhook `status` verbatim against `order_status`/`status_history`. (The legacy `order.failed` string is still accepted as a status _filter_ on GET /orders but is never emitted.)

```json
{
  "event_type": "order.status_changed",
  "event_id": "249956485092777984",
  "timestamp": 1763661470,
  "data": {
    "order_id": "249956252111773696",
    "status": "order.delivery_fulfilled",
    "tracking_number": "KnD3d5PMZyq5ulNcWkrq"
  }
}
```

### Results events (`event_type: "order_item.results_status_change"`)

`data`: `order_id`, `order_item_id`, `variant_id` (strings), `results_status`, and a `test_taker` object (`test_taker_id` string, `first_name`, `last_name`, `email`, `country_code` int, `phone_number` int). Status-dependent extras below.

| `results_status`                   | When it fires                                                                                            | Extra fields                                                    |
| ---------------------------------- | -------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------- |
| `results.kit_activated`            | End user activates the kit (activation suppliers only) – first appearance of `test_taker_id`, capture it | –                                                               |
| `results.sample_processing_in_lab` | Lab confirms receipt of the sample                                                                       | –                                                               |
| `results.partial_results_ready`    | A subset of the panel has resulted                                                                       | –                                                               |
| `results.results_ready`            | Results available – fetch and acknowledge                                                                | –                                                               |
| `results.sample_rejected`          | Lab rejects the sample                                                                                   | `failure_cause` (e.g. `"blood contaminated"`)                   |
| `results.lab_processing_error`     | Lab could not process the sample                                                                         | –                                                               |
| `results.escalation_raised`        | Clinical escalation on the result set                                                                    | `escalation_level`, `acknowledgment_due_by` (ISO 8601 deadline) |

`escalation_level` enum, ascending: `not_escalated`, `very_low`, `low`, `medium`, `high`, `very_high`.

Result-status lifecycle for an item (`results.awaiting_sample` is the initial state set at order creation, delivered in the order response rather than as a webhook):

```
results.awaiting_sample -> results.kit_activated -> results.sample_processing_in_lab
    -> results.partial_results_ready | results.results_ready
       | results.lab_processing_error | results.escalation_raised | results.sample_rejected
results.partial_results_ready -> results.results_ready | results.escalation_raised
results.results_ready -> results.escalation_raised
```

## Signature Verification

Webhooks are signed with HMAC-SHA256 using the account's Terra signing secret. Verify every request before trusting the body.

- **Header:** `X-Terra-Signature`, formatted `t=<timestamp>,v1=<hex_signature>`, where `t` is a Unix timestamp in **seconds** (not milliseconds – a millisecond comparison makes every verification fail) and `v1` is the hex HMAC-SHA256 signature.
- **Additional headers:** `X-Terra-Trace-Id` (equals the `event_id`; quote it to Terra support) and `Content-Type: application/json`.

Verification steps:

1. Extract the `X-Terra-Signature` header and parse `t` and `v1`.
2. Reject if `t` is outside a tolerance window of now (5 minutes / 300 seconds is the docs' default).
3. Construct the signed string as `"{t}.{raw_body}"` using the **raw, unaltered request body** (re-serializing the JSON breaks the signature).
4. Compute the expected HMAC-SHA256 with the signing secret.
5. Compare `v1` to the expected signature using a constant-time comparison.

## Delivery, Retries, Debugging

- Respond with any **2xx quickly** (deliveries time out after ~10 seconds); process asynchronously.
- Failures (network error, timeout, 408, 429, any 5xx) get up to 5 HTTP attempts with exponential backoff and jitter (~1s, 2s, 4s, 8s) on the first delivery; after that the event is redelivered as single attempts with growing delays (5s doubling, capped at 10 minutes), up to 10 deliveries in total (~14 calls over ~30 minutes) before dead-lettering. Handlers must be idempotent. **Other 4xx responses are recorded as rejected and NOT retried** – a verifier bug that returns 401 permanently drops events.
- Dead-lettered events can be replayed by Terra – not silently lost.
- Ordering is not guaranteed; treat each event as the item's current state.
- Debug with `GET /api/v1/webhook-deliveries?outcome=failed` (outcomes: `delivered`, `rejected`, `invalid` = no URL registered, `dead_lettered`, `replayed`; `attempts` and `final_status_code` included). Its `event_type` field uses the same strings as the webhook payloads. Cross-check authoritative state via `GET /api/v1/orders/{order_id}` `status_history`. See the [monitoring doc](https://docs.tryterra.co/vantage-api-docs/documentation/monitoring.md).
