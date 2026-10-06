---
name: terra-unified-api
description: Best practices for integrating Terra API – the unified health & fitness data API for 500+ wearables (Garmin, Fitbit, Oura, Whoop, Apple Health, Strava, Dexcom). Use when building with Terra API or tryterra.co, handling terra-signature (X-Terra-Signature) webhooks, storing wearable health data (activity, sleep, daily, body, nutrition, menstruation, hormone), managing device connections, or merging data across multiple devices.
license: MIT
compatibility: Requires network access to docs.tryterra.co for full API schemas
metadata:
  author: terra
  version: "1.1.0"
---

# Terra API Best Practices

Production-tested guidelines for building with Terra API, in 5 categories prioritized by impact.

## Start from an example app

For a new app, start from the published example for wearable connections, webhook ingestion and a health dashboard, and adapt it to the user's requirements. Run `terra version` and, if the CLI is missing, offer to install it (see below). Then list the current catalog and clone the closest fit:

```sh
terra examples list --select name,title,description
terra examples clone unified-api-web-app my-app
```

Neither needs a login. Read the downloaded README and AGENTS.md and follow `next_steps` to install dependencies, configure and run it before building on it. Cloning only downloads files. For an existing app, use the example as a reference and adapt the relevant pieces in place. In a chat assistant, which cannot run the CLI, give the user these commands to run in their own terminal, or link the source at https://github.com/tryterra/terra-examples/tree/main/examples/unified-api-web-app.

## Account tools: CLI or MCP

For the rules below, the account tools are how you check your work against what Terra API actually did rather than what you expected:

```sh
terra unified-api destinations list --env <dev-id>        # where webhooks go, and whether they are active
terra events list --env <dev-id> --outcome failed         # deliveries your endpoint rejected
terra events retrieve-payload <event_id> --env <dev-id>   # the exact body that was sent
terra users list --env <dev-id> --reference-id <ref>      # connection state, one row per provider
terra unified-api data scopes list --env <dev-id>         # which fields a payload will carry
```

Two of these change how you test. `terra events retrieve-payload` is the ground truth for "the payload was missing a field": absent there, the cause is the environment's data scopes rather than your handler. And `terra events resend --event-id <id> --event-type sleep --user-id <uuid>` replays a real stored event at your endpoint, so a handler can be exercised against real payloads with no device and no waiting for a provider to sync. A resend may arrive twice, so the handler must already dedupe (`rules/webhooks-dedupe-terra-reference.md`).

The signing secret these rules verify against is returned by `terra unified-api destinations create`, once, at creation.

Over MCP, two of these behave differently. `events_read` with `method: "retrieve_payload"` needs the MCP access level (Read only cannot read payload bodies), and the payload, which is a user's health data, enters the conversation. The `signing_secret` from `unified_api_destinations_write` `create` also lands in the conversation; prefer the CLI there, so the secret goes straight into the handler's secret store.

In a coding agent (Claude Code, Codex, Cursor and the like, on the user's machine or in the cloud), use the CLI, and offer to install it if it is missing: `curl -fsSL https://cli.tryterra.co/install.sh | sh` on macOS and Linux, `irm "https://cli.tryterra.co/install.ps1" | iex` in Windows PowerShell, or Homebrew or npm where the user already uses them. In a chat assistant (claude.ai, Claude Desktop, ChatGPT), use the Terra API admin MCP server, even when it can run code: its sandbox cannot install the CLI or sign in. Each admin command is a tool whose name and `method` spell it (`terra users list` is `users_read` with `method: "list"`). Only the CLI has `terra data-api`, `terra admin-api` and `terra examples`, and `--select` and `--jq` have no MCP equivalent. The `terra-cli` and `terra-mcp` skills carry the guardrails (confirming changes, keeping credentials out of transcripts), the errors, and a playbook per task. They administer the integration; they do not replace the API calls this skill describes.

## Rule Categories by Priority

| Priority | Category                    | Impact     | Prefix      |
| -------- | --------------------------- | ---------- | ----------- |
| 1        | Webhook Handling            | CRITICAL   | `webhooks-` |
| 2        | Data Handling & Idempotency | CRITICAL   | `data-`     |
| 3        | Auth & Connection Lifecycle | HIGH       | `auth-`     |
| 4        | Multi-Device Data           | MEDIUM     | `devices-`  |
| 5        | Testing                     | LOW-MEDIUM | `testing-`  |

## Quick Reference

### 1. Webhook Handling (CRITICAL)

- `webhooks-verify-raw-body` – Verify the signature header HMAC (terra-signature / X-Terra-Signature, read case-insensitively) over the raw unaltered body before parsing JSON
- `webhooks-ack-within-timeout` – Return 200 within the timeout (8s default), process async
- `webhooks-dedupe-terra-reference` – Deduplicate deliveries on X-Terra-Trace-Id; terra-reference is shared by all chunks of a large request
- `webhooks-archive-raw-payloads` – Archive raw payloads to object storage, link rows via a payload key
- `webhooks-handle-informational-events` – Route non-data events explicitly, unwrap s3_payload deliveries, never crash on unknown types

### 2. Data Handling & Idempotency (CRITICAL)

- `data-natural-keys` – Key activity/sleep by summary_id, daily-type data by (connection, date), hormone by timestamp
- `data-date-part-only` – Slice the date from the ISO string before any timezone conversion
- `data-superset-overwrite` – Standard fields follow the superset guarantee; overwrite when X-Terra-Ordering-Timestamp is newer or equal
- `data-coalesce-enrichment-scores` – Enrichment scores break the superset guarantee, COALESCE so nulls never overwrite
- `data-columns-over-blobs` – Extract metrics into typed columns, keep raw payloads in object storage
- `data-timestamp-localization` – Respect the timestamp_localization flag, pick one storage policy deliberately

### 3. Auth & Connection Lifecycle (HIGH)

- `auth-reference-id` – Pass your user ID as reference_id, it is the join key in every webhook
- `auth-handle-all-events` – Handle all seven auth event types with idempotent upserts
- `auth-reauth-id-swap` – user_reauth issues a new Terra API user ID, swap old for new
- `auth-parse-scopes` – Parse comma-separated scope strings; apply scopes_added/scopes_removed on permission_change
- `auth-reconcile-connections` – Reconcile against Terra API state on page mount, auth redirect, and a schedule
- `auth-integrations-endpoint-headers` – Send dev-id to the public integrations catalogue; without it you get every provider, not your enabled set

### 4. Multi-Device Data (MEDIUM)

- `devices-expect-cross-device-duplicates` – The same session arrives once per device with different summary_ids; your app owns the merge policy
- `devices-enrichment-provider-agnostic` – Enrichment scores are provider-agnostic and comparable, but only present when score weightings are active

### 5. Testing (LOW-MEDIUM)

- `testing-mock-boundaries` – Mock the SDK, database, and background tasks; make async processing eager
- `testing-cover-event-edge-cases` – Test replays, empty data arrays, unknown users, type 0, enrichment nulls, reauth swaps

## How to Use

Read the individual rule file in `rules/` when working on that area, e.g. read `rules/webhooks-verify-raw-body.md` and its siblings before writing a webhook endpoint. Each rule has incorrect/correct code examples and links to the relevant [docs.tryterra.co](https://docs.tryterra.co) page. Ask `terra docs ask` (or `docs_ask` over MCP) before fetching a page: it answers from the docs and cites its sources. Append `.md` to any docs URL for markdown.

## Related skills

This skill covers the core Unified API integration. Other Terra API products have skills of their own: `terra-mobile-sdk` (Apple Health, Samsung Health, Health Connect), `terra-streaming` (realtime data over websockets), `terra-planned-workouts` and `terra-routes` (write-to-device), `terra-lab-reports`, `terra-vantage` (diagnostic test ordering) and `terra-models`. For account work, use `terra-cli` or `terra-mcp`. The AI Interface is separate again: an MCP server that lets your app's own agent read a connected user's health data, not the admin MCP server above, which manages the account.
