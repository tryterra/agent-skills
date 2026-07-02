# Consumer protocol: Terra API to your backend

The walkthrough for a **consumer** connection – your backend receiving a developer's live stream. Source: [terra-greater-than-your-backend](https://docs.tryterra.co/streaming-api/terra-greater-than-your-backend). This file carries the semantics that are easy to get wrong; for the exact JSON payload shapes (HELLO, IDENTIFY, READY, DISPATCH, REPLAY), the full opcode table, and the complete close-code table, fetch [terra-greater-than-your-backend.md](https://docs.tryterra.co/streaming-api/terra-greater-than-your-backend.md) when writing or parsing the frames.

The producer connection (your app to the broker) uses the same endpoint and handshake but is opened and driven by the RT SDKs, so you rarely implement it by hand. This document is what you write yourself.

**Endpoint:** `wss://ws.tryterra.co/connect` (same for producer and consumer; the IDENTIFY `type` decides the role).

## Handshake sequence

1. **Open** the websocket. The server immediately sends `Op 2 HELLO` carrying `heartbeat_interval` in milliseconds.

2. **Start heartbeating.** Send `Op 0 HEARTBEAT`; the server replies `Op 1 HEARTBEAT_ACK`. Send the **first** heartbeat after `heartbeat_interval * jitter` ms, where jitter is random in 0..1 (this staggers reconnect storms), then at most once per `heartbeat_interval`. If you receive no HEARTBEAT_ACK, close and open a new connection. If the server receives no heartbeat within the window, it closes with **4005**.

3. **IDENTIFY within 15 seconds** of connecting, or the server closes with **4000**. Send `Op 3` with a fresh token and the connection `type`:

   | Type | Name      | Connection                             | Token endpoint                                             |
   | ---- | --------- | -------------------------------------- | ---------------------------------------------------------- |
   | 0    | USER      | producer (mobile SDKs sending data)    | `POST https://ws.tryterra.co/auth/user?id=<terra_user_id>` |
   | 1    | DEVELOPER | consumer (your backend receiving data) | `POST https://ws.tryterra.co/auth/developer`               |

   Both token endpoints are served over HTTPS by the websocket host (`ws.tryterra.co`) – they do **not** exist on `api.tryterra.co`. Mint tokens server-side with your Dev ID and API key; see the [REST endpoints reference](https://docs.tryterra.co/reference/streaming-api/api-endpoints.md) for the exact request/response schemas.

   Tokens are **single-use**: the server deletes the token after a successful IDENTIFY. A dropped connection must mint a fresh token before reconnecting.

4. **READY.** On success the server replies `Op 4`; data then streams in as `Op 5 DISPATCH` payloads.

**Consumer session cap.** A per-developer limit caps concurrent consumer connections; exceeding it closes the new connection with **4002**. The cap is a server-side config setting (it has run as low as 1; dashboard sessions do not count against it), so do not architect around any guaranteed number of concurrent consumers – on 4002, close an existing session or back off.

## DISPATCH semantics

Each `Op 5` DISPATCH is one reading, with top-level `uid`, `seq`, `t`, and a `d` payload (fetch the live doc for the exact shape). The parts that surprise:

- `seq` is a monotonically increasing but **sparse** ordering cursor. Gaps between consecutive values are normal and do not indicate lost data. Use it only to order DISPATCHes and as the `after` bound for replay.
- `t` is the data type (`HEART_RATE`, `STEPS`, `ACCELERATION`, ...). For exercise streams from a watch, `t` is the exercise type and data type **concatenated**, e.g. `RUNNING_HEART_RATE`.
- Inside `d`, a reading carries either `val` (scalar types like heart rate) or a nested `d` array of doubles (multi-axis types, e.g. `[x, y, z]` for accelerometer or `[lat, lng]` for location) – one or the other depending on the data type, not both.

## Replay: backfilling a gap

If your connection drops and you miss data, use REPLAY (`Op 7`) after reconnecting:

1. Re-IDENTIFY (with a fresh token), then wait for the first live DISPATCH and note its `seq` (call it `firstLive`).
2. Send REPLAY with `after` = the last `seq` you processed before the drop, and `before` = `firstLive`.
3. Process the replayed DISPATCHes (they arrive as ordinary `Op 5` payloads), then resume live handling.

- **`after` is required; `before` is optional.** `before` is an exclusive upper bound – omit it to replay everything after `after`. (Some docs copies still say both bounds are required; the shipped behavior and the AsyncAPI spec treat `before` as optional.)
- Bounds are **exclusive**: `after: 28, before: 43` replays 29 through 42.
- Replay reads from the Terra API data warehouse, so a payload becomes replayable a few seconds after it was delivered live. If a REPLAY returns fewer messages than expected, wait a moment and request it again. There is currently no retention limit on replayable data, though that may change.
- If no live DISPATCH has arrived yet, there is nothing to backfill – wait for one before replaying.

## Close codes and reconnecting

The codes split into two groups; fetch the live doc for the verbatim code table.

- **Client bugs – fix the client, do not retry-loop:** **4000** (no IDENTIFY within 15 s), **4003** (more than one IDENTIFY per connection), **4004** (invalid opcode, or one not valid for the session type, e.g. SUBMIT on a consumer), and **1003** (malformed frame). A blind reconnect just loops on the same error.
- **Safe to reconnect after the remedy:** **4001** (bad or expired token – mint a fresh one), **4002** (session cap – close an existing consumer or back off), **4005** (missed heartbeat – fix your cadence, then reconnect). **1000** (normal) and **1011** (server internal error) are standard closes.
