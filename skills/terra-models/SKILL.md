---
name: terra-models
description: Run Terra API health models (Sleep Window, Health Terrain) over a connected user's data for a date range to return ready-to-use wellness insights. Use when building with Terra API Models, the /v2/models or /v2/models/run endpoints, model_run pricing, or turning a user's Terra API data into a sleep-schedule or whole-body health-shift insight.
license: MIT
metadata:
  author: terra
  version: "1.0.0"
compatibility: Requires network access to docs.tryterra.co for full request and response schemas.
---

# Terra API Models

Run one of Terra API's health models over a connected user's data for a date range and get a ready-to-use insight back: one request in, one insight out. No model to host. Every model is a **wellness indicator, not a medical or diagnostic tool**; never present its output as clinical.

## When to use this

Building anything that calls `GET /v2/models` or `GET /v2/models/run`, prices `model_run` usage, or turns a user's Terra API data into a sleep-schedule or whole-body health-shift insight.

## Connect the user first

Models run for a user you have connected through the Unified API (see the `terra-unified-api` skill), over a date range you choose. A model cannot always return an insight for a given user and range; when it cannot, the run returns an empty result (see Reading the result), not an error, and it still costs a credit (see Pricing).

## The two models (generally available)

| `model` id       | Returns                                                                                              | Needs                                            |
| ---------------- | ---------------------------------------------------------------------------------------------------- | ------------------------------------------------ |
| `sleep_window`   | A recommended bedtime, wake time, and in-bed duration, from how regular recent sleep timing has been | Overnight sleep sessions from the last few weeks |
| `health_terrain` | For 15 broad health areas, how the last week shifted relative to the user's own recent baseline      | A week of daily, sleep, and activity data        |

**Only `sleep_window` and `health_terrain` are GA** and documented. Build against those two and treat any other model id as pre-GA and unstable.

## Making a run

`GET https://api.tryterra.co/v2/models/run`

Query params: `model`, `user_id`, `start_time`, `end_time` (all ISO 8601). Headers: `x-api-key` and `dev-id` (your own keys; this is not a privileged endpoint).

```bash
curl --request GET \
  'https://api.tryterra.co/v2/models/run?model=sleep_window&user_id=USER_ID&start_time=2026-04-01T00:00:00Z&end_time=2026-07-01T00:00:00Z' \
  --header 'x-api-key: YOUR_API_KEY' \
  --header 'dev-id: YOUR_DEV_ID'
```

Fetch https://docs.tryterra.co/models.md for the exact params and the full per-model response schema before you build request or response types; the response shape differs per model and evolves.

## Reading the result (the part agents get wrong)

- **Empty is not an error.** A run can return HTTP 200 with `unsupported: true` (plus `unsupported_reason` and `supported_devices`), `no_data: true`, or `supported: false` in place of an insight. That means "this user, device, or range cannot produce this insight," not a failure. Surface it to the user; do not retry it as an error.
- **Validate before you run.** Every run bills a credit even when the result is empty or unsupported (it is metered server-side per run). Confirm the user has a supported device and data in the range before running, or you pay for empty runs.
- **The shape is per-model.** `sleep_window` returns a `window` object; `recommended_bed` and `recommended_wake` are local clock times, and `approximate: true` means the schedule was estimated from limited history. `health_terrain` returns an `areas` array where each area's `sigma` is the week's shift relative to the user's **own** baseline (negative below, positive above), plus `x` and `y` coordinates you can plot as a map.
- **`truncated: true`** means the run hit the per-request data cap; the insight is still valid but computed over a bounded slice of the range.
- Model outputs are modest-confidence indicators. Do not present a single result as authoritative.

## Pricing

Usage-based: **$0.01 per model run**, drawn from your plan's monthly credit allowance. One run is one model over one user for one date range, regardless of how much data the range covers; running two models, or the same model on two users, is two runs. A run started from the Terra Dashboard and one made through this API bill through the identical path. Details: https://docs.tryterra.co/unified-api/pricing

## Boundaries

- **Not the Unified API.** Connecting users, webhooks, and historical data are the Unified API (`terra-unified-api`); a model run analyzes a connected user's data and returns an insight.
- **Not Health Scores.** Health Scores are continuous physiological scores; Models return a discrete, on-demand insight from a single call.
