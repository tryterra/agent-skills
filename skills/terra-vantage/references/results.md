# Vantage API Results and Acknowledgment

How to fetch normalized test results and satisfy the mandatory acknowledgment step. Sources: [results (docs)](https://docs.tryterra.co/vantage-api-docs/documentation/results), [acknowledging results](https://docs.tryterra.co/vantage-api-docs/important-information/acknowledging-results), [results (API reference)](https://docs.tryterra.co/vantage-api-reference/core-resources/results).

## Endpoints

Both endpoints use HTTP Basic auth and both require the `test_taker_id` query parameter.

| Method | Path                                              | Description                                        |
| ------ | ------------------------------------------------- | -------------------------------------------------- |
| GET    | `/api/v1/results/{order_item_id}`                 | Get a presigned URL to download results in FHIR format |
| POST   | `/api/v1/results/{order_item_id}/acknowledge`     | Acknowledge that results were retrieved and processed |

`order_item_id` is an integer (min 1); `test_taker_id` is an integer (min 1), passed as a query parameter on both calls.

### Get results (presigned URL)

`GET /api/v1/results/{order_item_id}?test_taker_id={id}` returns a time-limited presigned URL to download normalized results as FHIR JSON.

Response `200`:

- `download_url` (string) – the presigned download link.
- `expires_at` (string) – expiry timestamp.
- `format` (string, enum: `"json"`).

The URL is valid for **15 minutes**. Re-fetch this endpoint to mint a fresh URL rather than caching it. Errors: `400` invalid/missing order item ID, `401` unauthorized, `404` results not found for the order item, `500` server error.

### Acknowledge results

`POST /api/v1/results/{order_item_id}/acknowledge?test_taker_id={id}` confirms that results were retrieved and processed by the test taker / end user. No request body is specified. Response `200`: `status` (string). Errors: `400` invalid order item ID, `401` unauthorized, `404` order item not found, `500` server error.

## Acknowledgment Is Mandatory

Acknowledging results is not optional; it is a fundamental requirement in the patient care workflow. All results, whether indicating low or high clinical escalation, must be explicitly acknowledged before patients can access them. Acknowledgment records that the client has reviewed the outcome and takes responsibility for communicating the appropriate severity to the end user, so that patients receive informed guidance before seeing results.

Consequences of not acknowledging:

- **Liability transfer.** Failing to acknowledge "initiates a chain of liability that transfers responsibility directly to you," and your organization assumes full liability for adverse outcomes resulting from delayed or unacknowledged results.
- **Direct patient contact.** If results remain unacknowledged, test suppliers and medical teams are authorized to reach out to patients directly to ensure they receive critical health information.

Design the flow so acknowledgment is part of delivering the result: fetch it, present it to the user, and acknowledge as part of that delivery.

## FHIR Result Format

Results download as a FHIR **Bundle** (`resourceType: "Bundle"`) whose entries include `DiagnosticReport`, `Patient`, and `Observation` resources.

**DiagnosticReport** includes `code`, `effectiveDateTime`, `issued`, `status` (e.g. `"final"`), a `result` array referencing the observations, and `subject` linking to the patient.

**Observation** entries include:

- `code` with test identifiers (e.g. `CHOL`, `HDL`, `LDL`, `TRIG`, `HBA1C`).
- `valueQuantity` with the numeric result and units (e.g. `mg/dL`, `%`).
- `referenceRange` with `high` / `low` normal bounds.
- `interpretation` with HL7 codes.

**Interpretation codes.** `N` = Normal, `L` = below low normal, `H` = above high normal. `HH` or `LL` indicate critical cases per HL7 v2.8 Table 0078. For an out-of-range result, compare `value` against `high` and `low` (example: an HDL value of 35.2 below a low threshold of 40.0 receives an `L` interpretation).

**Escalations.** A `results.escalation_raised` webhook carries `escalation_level`, up to a maximum of `escalation_level.very_high`. Critical interpretation codes (`HH` / `LL`) correspond to escalated results. Sample rejections are surfaced via the `results.sample_rejected` webhook with a `failure_cause`. See [references/webhooks.md](webhooks.md) for both.
