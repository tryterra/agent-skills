# terra-mobile-sdk

Integration guidance for the [Terra API](https://tryterra.co) mobile SDK – the on-device path for health sources that have **no web API**: Apple Health (HealthKit), Samsung Health, and Health Connect.

Every other provider (Garmin, Fitbit, Oura, Whoop, Strava, Dexcom, and 500+ more) connects through the [Unified API](https://docs.tryterra.co/unified-api), covered by the `terra-unified-api` skill. This skill is for the three sources you can only reach on-device.

`SKILL.md` carries the 2.x workflow, the permission and sync rules, how to detect and upgrade a 1.x app, and every cross-platform gotcha; the `references/` files carry per-platform setup detail and code.

## Installation

```bash
npx skills add tryterra/agent-skills --skill terra-mobile-sdk
```

Or manually for Claude Code:

```bash
cp -r skills/terra-mobile-sdk ~/.claude/skills/
```

## Contents

| File                         | What it covers                                                                                                                                                     |
| ---------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `SKILL.md`                   | When the SDK is the right tool, the workflow, permissions, what syncs and when, upgrading from 1.x, cross-platform gotchas, decisions left to you                  |
| `references/ios.md`          | TerraSDK (Swift): SwiftPM install, entitlements and Info.plist, `Terra(devID:tokenProvider:)`, `BackgroundSync`, permissions, host background tasks                |
| `references/android.md`      | terra-android 2.x (Kotlin): Gradle, the Health Connect manifest, `Application` setup, `PermissionLauncher`, Samsung add-on, OEM battery restrictions               |
| `references/react-native.md` | @tryterra/react-native: iOS bootstrap, Android meta-data, `createTerra`, connect and permissions, error codes                                                      |
| `references/sdk-1x.md`       | The previous major version, for maintaining a 1.x app: workflow, gotchas, and per-platform setup for TerraiOS, TerraAndroid, terra-react, terra_flutter_bridge 0.x |
| `references/flutter.md`      | terra_flutter_bridge 2.x: iOS bootstrap, `FlutterFragmentActivity`, `createTerra`, connect and permissions                                                         |

## Highlights

- The mobile SDK is **only** for Apple Health, Health Connect, and Samsung Health; every other provider uses the Unified API
- 2.x is a rebuild: `import TerraiOS`, `Terra.instance`, `initConnection` or `terra-react` mean a 1.x app that must follow its upgrade guide first
- Build one client at launch with a token provider and register background sync there; after the permission sheet the SDK uploads on its own
- Mint the single-use token (3-minute expiry) on **your backend** with the same `reference_id` the app passes to `connect`
- iOS never discloses read grants; Health Connect grants nothing your manifest does not declare
- Per-type requests (2.3.0+) make the install type-scoped for good: unrequested fields are left out, not sent as zero

Full API documentation: [docs.tryterra.co](https://docs.tryterra.co) (append `.md` to any docs URL for markdown).
