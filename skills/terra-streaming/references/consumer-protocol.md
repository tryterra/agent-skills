# Consumer protocol: Terra API to your backend

The full websocket protocol for a **consumer** connection – your backend receiving a developer's live stream. Source: [terra-greater-than-your-backend](https://docs.tryterra.co/streaming-api/terra-greater-than-your-backend).

The producer connection (your app to the broker) uses the same endpoint and handshake but is opened and driven by the RT SDKs, so you rarely implement it by hand. This document is what you write yourself.

**Endpoint:** `wss://ws.tryterra.co/connect` (same for producer and consumer; the IDENTIFY `type` decides the role).

## Handshake sequence

1. **Open** the websocket. The server immediately sends `Op 2 HELLO` with the heartbeat interval in milliseconds:

   ```json
   { "op": 2, "d": { "heartbeat_interval": 40000 } }
   ```

2. **Start heartbeating** (see below). Send the first heartbeat after `heartbeat_interval * jitter` ms, where jitter is random in 0..1.

3. **IDENTIFY within 15 seconds** of connecting, or the server closes with **4000**. Send `Op 3` with a fresh developer token and `type: 1`:

   ```json
   { "op": 3, "d": { "token": "your_developer_token_here", "type": 1 } }
   ```

   | Type | Name | Connection | Token endpoint |
   |------|------|------------|----------------|
   | 0 | USER | producer (mobile SDKs sending data) | `POST /auth/user?id=<terra_user_id>` |
   | 1 | DEVELOPER | consumer (your backend receiving data) | `POST /auth/developer` |

   Tokens are **single-use**: the server deletes the token after a successful IDENTIFY. A dropped connection must mint a fresh token before reconnecting.

4. **READY.** On success the server replies `Op 4`:

   ```json
   { "op": 4 }
   ```

5. **DISPATCH.** Data now streams in as `Op 5` payloads.

**Consumer session cap.** A per-developer limit caps concurrent consumer connections. During the current rollout the cap is **1**, so opening a second consumer closes the new connection with **4002** – close the previous session first. The cap is server-side and may be raised, so do not hard-code an assumption of exactly one consumer.

## Heartbeating

Send `{ "op": 0 }`; the server replies `{ "op": 1 }` (HEARTBEAT_ACK).

- First heartbeat after `heartbeat_interval * jitter` ms.
- After that, send at most once per `heartbeat_interval`.
- If you receive no HEARTBEAT_ACK, close the connection and open a new one.
- If the server receives no heartbeat within the window, it closes with **4005**.

## DISPATCH payload

Each `Op 5` DISPATCH is one reading:

```json
{
  "op": 5,
  "d": {
    "ts": "2022-05-04T10:26:11.268507+01:00",
    "val": 95
  },
  "uid": "user_id_here",
  "seq": 73,
  "t": "HEART_RATE"
}
```

- `uid` – Terra user ID of the user whose device produced the reading.
- `t` – data type, e.g. `HEART_RATE`, `STEPS`, `DISTANCE`, `ACCELERATION`, `ECG`, `HRV`, `CALORIES`, `LOCATION`, `GYROSCOPE`. For exercise streams from a watch, `t` is the exercise type and data type concatenated, e.g. `RUNNING_HEART_RATE`.
- `seq` – a monotonically increasing but **sparse** ordering cursor. Gaps are normal and do not indicate lost data. Use it to order DISPATCHes and as the `after` bound for replay.
- `d` – the payload:
  - `ts` – ISO 8601 timestamp of the reading.
  - `val` – scalar value (present for single-value types like heart rate or step count).
  - `d` – array of doubles (present for multi-axis types, e.g. `[x, y, z]` for accelerometer/gyroscope or `[lat, lng]` for location).

A given DISPATCH carries either `val` or the nested `d` array depending on the data type, not both.

## Replay: backfilling a gap

If your connection drops and you miss data, use REPLAY (`Op 7`) after reconnecting:

1. Re-IDENTIFY, then wait for the first live DISPATCH and note its `seq` (call it `firstLive`).
2. Send REPLAY with `after` = the last `seq` you processed before the drop, and `before` = `firstLive`.
3. Process the replayed DISPATCHes (they arrive as ordinary `Op 5` payloads), then resume live handling.

```json
{ "op": 7, "d": { "after": 28, "before": 43 } }
```

- `after` (**required**) – replay sequence numbers **greater than** this value; typically the last `seq` you processed before disconnecting.
- `before` (**required**) – replay sequence numbers **less than** this value; set it to the first live DISPATCH's `seq` so you backfill exactly the gap.
- **Both bounds are required.** A REPLAY without `before` returns no messages.
- Bounds are **exclusive**: `after: 28, before: 43` replays 29 through 42.

Replay reads from the Terra API data warehouse, so a payload becomes replayable a few seconds after it was delivered live. If a REPLAY returns fewer messages than expected, wait a moment and request it again. There is currently no retention limit on replayable data, though that may change.

If no live DISPATCH has arrived yet, there is nothing to backfill – wait for one before replaying.

## Close codes

| Code | Reason | What to do |
|------|--------|------------|
| 4000 | IDENTIFY expected but not received | Send IDENTIFY within 15 seconds of connecting |
| 4001 | Improper token passed | Token invalid or expired – mint a fresh one |
| 4002 | Consumer session limit reached | Another consumer session is active for your Dev ID (current cap) – close it first |
| 4003 | Multiple IDENTIFY payloads received | Send IDENTIFY at most once per connection |
| 4004 | Invalid opcode received | You sent an unrecognized opcode, or one not valid for your session type (e.g. SUBMIT on a consumer) |
| 4005 | Heartbeat expected but not received | Send heartbeats within the `heartbeat_interval` window |

The server may also close with standard codes **1000** (normal), **1003** (malformed frame), or **1011** (internal error).

**Reconnect logic:** 4000, 4003, 4004, and 1003 signal a client-side bug – fix the client rather than reconnecting, since a blind retry loops on the same error. The rest are safe to reconnect after the remedy above (for 4001 always mint a fresh token; for 4002 close the other session first).

## Testing without hardware

From the Streaming page of the [Terra dashboard](https://dashboard.tryterra.co/dashboard/streaming), create a test user. The Terra API streams synthetic live data (heart rate, steps, and more) through the real API, letting you stand up and validate the consumer end to end before connecting a device.
