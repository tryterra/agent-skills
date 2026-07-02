# terra-streaming

Best practices for the [Terra API](https://tryterra.co) Streaming (Real-Time) API – live, roughly per-second biometric data streamed from wearables over websockets.

Covers the producer/broker/consumer architecture, the `wss://ws.tryterra.co/connect` handshake and opcodes, single-use token minting, close codes and reconnect logic, replay/backfill, and per-platform RT SDK setup (iOS, Android, React Native, Flutter, Wear OS). The architecture and protocol gotchas live inline in `SKILL.md`; the full consumer protocol and platform setup live in `references/`.

## Installation

```bash
npx skills add tryterra/agent-skills --skill terra-streaming
```

Or manually for Claude Code:

```bash
cp -r skills/terra-streaming ~/.claude/skills/
```

## Highlights

- Streaming carries per-second signals only (heart rate, steps, distance, acceleration, ECG, HRV, calories, location, gyroscope); workouts, sleep, and daily totals belong to the Health & Fitness API
- One websocket endpoint for both roles; the IDENTIFY `type` (0 producer, 1 consumer) sets the role
- **Every token is single-use** – the server deletes it after IDENTIFY, so each reconnect needs a fresh one
- `seq` is monotonic but **sparse** – gaps are normal, not lost data
- REPLAY needs **both** `after` and `before` (exclusive bounds); omitting `before` returns nothing
- Close codes 4000/4003/4004/1003 are client bugs – fix, don't retry-loop
- Test end to end without hardware using a synthetic dashboard test user

## Contents

| File | What it covers |
|------|----------------|
| `SKILL.md` | Architecture, tokens, opcodes, protocol gotchas, developer-choice facts |
| `references/consumer-protocol.md` | Full handshake, heartbeats, DISPATCH payload, REPLAY, close codes |
| `references/ios.md` | Native iOS producer (Apple Developer Program required), Apple Watch |
| `references/android.md` | Native Android producer, ANT+, device-scan variants |
| `references/react-native.md` | React Native producer, iOS `BLWidget` vs Android scan |
| `references/flutter.md` | Flutter producer, `startRealtimeToApp` vs `startRealtimeToServer` |
| `references/wear-os.md` | Wear OS watch paired to an Android phone, exercise streams |

Full documentation: [docs.tryterra.co/streaming-api](https://docs.tryterra.co/streaming-api).
