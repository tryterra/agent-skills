# Vantage API Results and Acknowledgment

How to fetch normalized test results and satisfy the mandatory acknowledgment step. Sources: [results (docs)](https://docs.tryterra.co/vantage-api-docs/documentation/results), [acknowledging results](https://docs.tryterra.co/vantage-api-docs/important-information/acknowledging-results), [results (API reference)](https://docs.tryterra.co/vantage-api-reference/core-resources/results).

## Endpoints

Both endpoints require auth and the **`test_taker_id` query parameter** (a string-serialized ID that first appears on the `results.kit_activated` webhook; recoverable from `GET /api/v1/orders/{order_id}` under `items[].test_taker_ids`).

| Method | Path                                          | Description                                                                                                                                      |
| ------ | --------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------ |
| GET    | `/api/v1/results` (index)                     | Keyset-paginated result activity: `results_status`, `is_acknowledged`, `test_taker_id` per row – use it to find ready-but-unacknowledged results |
| GET    | `/api/v1/results/{order_item_id}`             | Get a presigned URL to download results in FHIR format                                                                                           |
| POST   | `/api/v1/results/{order_item_id}/acknowledge` | Record the end user's confirmation that they viewed their results                                                                                |

### Get results (presigned URL)

`GET /api/v1/results/{order_item_id}?test_taker_id={id}` returns a time-limited presigned URL to download normalized results as FHIR JSON.

Response `200`: `download_url` (string), `expires_at` (string), `format` (enum: `"json"`).

The URL is valid for **15 minutes**. Re-fetch this endpoint to mint a fresh URL rather than caching it. Each order item holds at most one panel, so a result is uniquely identified by `order_item_id`. Errors (RFC 7807 problem detail): `400` invalid/missing IDs, `401` unauthorized, `404` results not found for the order item, `500` server error.

### Acknowledge results

`POST /api/v1/results/{order_item_id}/acknowledge?test_taker_id={id}` records the end user's affirmative confirmation that they received and viewed their results. No request body. Response `200`: `{"status": "acknowledged"}`.

**It must be triggered by an explicit end-user action** (a button or checkbox in your UI after the results are displayed) – never automatically by the backend on retrieval or delivery. Required for compliance and audit trails.

## Acknowledgment Is Mandatory

All results, whether indicating low or high clinical escalation, must be explicitly acknowledged before patients can access them. Acknowledgment records that the client has reviewed the outcome and takes responsibility for communicating the appropriate severity to the end user.

Consequences of not acknowledging:

- **Liability transfer.** Failing to acknowledge "initiates a chain of liability that transfers responsibility directly to you," and your organization assumes full liability for adverse outcomes resulting from delayed or unacknowledged results.
- **Direct patient contact.** Escalated results carry an `acknowledgment_due_by` deadline in the webhook; if results remain unacknowledged, test suppliers and medical teams are authorized to reach out to patients directly.

Design the flow so acknowledgment is part of delivering the result: fetch it, present it, let the user confirm, then acknowledge.

## FHIR Result Format

Results download as a FHIR **Bundle** (`resourceType: "Bundle"`) whose entries include `DiagnosticReport`, `Patient`, and `Observation` resources.

**DiagnosticReport** includes `code`, `effectiveDateTime`, `issued`, `status` (e.g. `"final"`), a `result` array referencing the observations, and `subject` linking to the patient.

**Observation** entries include:

- `code` with test identifiers (e.g. `CHOL`, `HDL`, `LDL`, `TRIG`, `HBA1C`).
- `valueQuantity` with the numeric result and units (e.g. `mg/dL`, `%`).
- `referenceRange` with `high` / `low` normal bounds.
- `interpretation` with HL7 codes.

**Interpretation codes.** `N` = Normal, `L` = below low normal, `H` = above high normal. `HH` or `LL` indicate critical cases per HL7 v2.8 Table 0078. For an out-of-range result, compare `value` against `high` and `low` (example: an HDL value of 35.2 below a low threshold of 40.0 receives an `L` interpretation).

**Escalations.** A `results.escalation_raised` webhook carries `escalation_level` (`not_escalated` → `very_high`) and `acknowledgment_due_by`. Critical interpretation codes (`HH`/`LL`) correspond to escalated results. Sample failures surface as `results.sample_rejected` (with `failure_cause`) or `results.lab_processing_error` – build product flows for both. See [references/webhooks.md](webhooks.md).
