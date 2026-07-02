# terra-mobile-sdk

Integration guidance for the [Terra API](https://tryterra.co) mobile SDK – the on-device path for health sources that have **no web API**: Apple Health (HealthKit), Samsung Health, and Health Connect.

Every other provider (Garmin, Fitbit, Oura, Whoop, Strava, Dexcom, and 500+ more) connects through the [Health & Fitness API](https://docs.tryterra.co/health-and-fitness-api), covered by the `terra-api` skill. This skill is for the three sources you can only reach on-device.

`SKILL.md` carries the six-step workflow and every cross-platform gotcha inline; the `references/` files carry per-platform setup detail and code.

## Installation

```bash
npx skills add tryterra/agent-skills --skill terra-mobile-sdk
```

Or manually for Claude Code:

```bash
cp -r skills/terra-mobile-sdk ~/.claude/skills/
```

## Contents

| File                         | What it covers                                                                                                                                                                  |
| ---------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `SKILL.md`                   | When the SDK is the right tool, the six-step workflow, permission-popup behavior, background delivery, cross-platform gotchas, decisions left to you                            |
| `references/ios.md`          | TerraiOS (Swift): capabilities, info.plist, `Terra.instance`, deferred prompting, `setUpBackgroundDelivery`, `setIgnoredSources`, writing data, WorkoutKit planned-workout sync |
| `references/android.md`      | TerraAndroid (Kotlin): Gradle coordinates, minSDK 28, Samsung vs Health Connect setup, ProGuard, manifest intent-filters, deprecated `startIntent`                              |
| `references/react-native.md` | terra-react: install, iOS + Android native setup, `initTerra`/`initConnection`, AppDelegate background delivery, `postActivity` (Apple Health only)                             |
| `references/flutter.md`      | terra_flutter_bridge: `flutter pub`, native setup, `TerraFlutter` API, AppDelegate background delivery, getters                                                                 |

## Highlights

- The mobile SDK is **only** for Apple Health, Samsung Health, and Health Connect – Google Fit is better read via the web API for reliability
- Mint the single-use auth token (3-minute expiry) from **your backend**, just-in-time; never ship the API key in a production client
- The permission popup fires **once** on Apple Health and Health Connect – calling `initConnection` again is a no-op
- `schedulerOn` has **no effect on iOS**; iOS background delivery is controlled by `setUpBackgroundDelivery()` and only pushes dashboard-enabled data types
- Samsung Health needs an approved partnership plus the `-keep class com.samsung.android.** { *; }` ProGuard rule (release builds crash without it)
- A new device or reinstall replaces the existing connection: Terra API issues a new `user_id`, deletes the old one, and sends a `user_reauth` webhook so you can migrate `old_user.user_id` to `new_user.user_id`

Full API documentation: [docs.tryterra.co](https://docs.tryterra.co) (append `.md` to any docs URL for markdown).
