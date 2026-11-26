---
name: terra-mobile-sdk
description: Integrate the Terra API mobile SDK 2.x for on-device health sources that have no web API, Apple Health (HealthKit), Health Connect and Samsung Health, on iOS (TerraSDK), Android (co.tryterra.sdk), React Native (@tryterra/react-native) and Flutter (terra_flutter_bridge 2.x). Use when connecting Apple Health, Health Connect or Samsung Health from a mobile app; when writing Terra(devID:tokenProvider:), terra.connect, permissions.request, readTypes or BackgroundSync.register; when minting a mobile SDK token via /auth/tokens or generateAuthToken; when declaring Health Connect manifest permissions or HealthKit entitlements; when data stops uploading (linkRevoked, backgroundRefreshUnscheduled, BackgroundRestricted); or when upgrading an app from the 1.x SDK (import TerraiOS, Terra.instance, initConnection, getUserId, setUpBackgroundDelivery, terra-react).
license: MIT
compatibility: Requires network access to docs.tryterra.co for full API schemas
metadata:
  author: terra
  version: "2.0.0"
---

# Terra API Mobile SDK

Guidance for the Terra API mobile SDK 2.x on iOS, Android, React Native and Flutter. The workflow and the cross-platform gotchas live here; per-platform setup (native config, install, code) lives in `references/`. The current release is 2.3.1 on all four platforms, and every platform shares the version number.

## Prerequisites

1. **SDK 2.x, not 1.x.** Minimums: iOS 15 (React Native iOS 15.1); Android `minSdk` 28 and `compileSdk` 36 (Samsung Health add-on: `minSdk` 29); React Native 0.81 or later with the New Architecture; Flutter 3.24 and Dart 3.5 or later. Per-type permission requests and Apple Health Records need 2.3.0 or later.
2. **New code targets 2.x.** 2.x is a rebuild: the module, entry point and every call changed, and 1.x code does not compile against it. Check an existing app with "Upgrading from 1.x" below before writing any SDK code into it.
3. **A backend endpoint that mints Terra API auth tokens.** The app never holds the API key.
4. **The data types you need are enabled for the environment** (see "What syncs" below). A type that is not enabled is refused on upload.

## Account tools: CLI or MCP

For a mobile integration, the account tools supply the credential your backend holds and confirm that a device actually registered.

**Setting up, once.** The backend that mints per-user tokens needs a credential of its own:

```sh
terra environments list --select dev_id,name                    # the dev-id the app is built against
terra data-tokens create --env <dev-id> --name mobile --scopes auth:write
```

**Checking your work, as often as you like.** These are read-only and print no credential material:

```sh
terra data-tokens list --env <dev-id> --select token_id,name,scopes,expires_at,last_used_at,revoked_at
terra users list --env <dev-id> --provider APPLE --select user_id,reference_id,active
```

`data-tokens list` is metadata only: it says whether a usable token exists and what it is scoped for, without re-showing any bearer.

**Exercising the mint path by hand.** This one is not a read: it mints the short-lived token the SDK's token provider returns, and prints it.

```sh
terra data-api /auth/tokens -X POST -q reference_id=<your id>
```

`reference_id` is a **query** parameter here, so it takes `-q`. Passing it with `-d` puts it in a JSON body the endpoint does not read, and the call still succeeds: you get back a token that is silently unbound. Bound, the token is tied to that identifier and redemption ignores anything else, which is what stops a token attaching a device to the wrong user. It is still a credential on stdout, so keep it out of CI logs.

The docs' code samples call `POST /auth/generateAuthToken`. That is the deprecated spelling of `/auth/tokens`, identical in parameters and response, and kept indefinitely. New code should use `/auth/tokens`.

**Never ship the admin token or the environment API key in an app.** `terra data-tokens create --scopes auth:write` is the scoped, revocable credential for the backend that mints SDK tokens: several coexist per environment, so rotation is mint-new then revoke-old with no cutover. Reach for `terra environments retrieve-api-key` only when something genuinely needs the environment's API key; nothing in the mobile flow does, and it prints the webhook signing secret alongside it.

After a device connects, `terra users list --reference-id <ref>` says whether the record landed and stayed active, which separates an SDK problem from a permissions one.

In a coding agent (Claude Code, Codex, Cursor and the like, on the user's machine or in the cloud), use the CLI, and offer to install it if it is missing: `curl -fsSL https://cli.tryterra.co/install.sh | sh` on macOS and Linux, `irm "https://cli.tryterra.co/install.ps1" | iex` in Windows PowerShell, or Homebrew or npm where the user already uses them. In a chat assistant (claude.ai, Claude Desktop, ChatGPT), use the Terra API admin MCP server, even when it can run code: its sandbox cannot install the CLI or sign in. Each admin command is a tool whose name and `method` spell it (`terra users list` is `users_read` with `method: "list"`). Only the CLI has `terra data-api`, `terra admin-api` and `terra examples`, and `--select` and `--jq` have no MCP equivalent. The `terra-cli` and `terra-mcp` skills carry the guardrails (confirming changes, keeping credentials out of transcripts), the errors, and a playbook per task. They administer the integration; they do not replace the API calls this skill describes.

## When the mobile SDK is the right tool

Only three sources need it, because they have no web API: **Apple Health** (iOS), **Health Connect** and **Samsung Health** (Android). Every other provider (Garmin, Fitbit, Oura, Whoop, Strava, Dexcom and the rest) connects through the [Unified API](https://docs.tryterra.co/unified-api/getting-started) with no SDK. Data the SDK uploads reaches the same data destination as web API data, so the receiving webhook and storage are the `terra-unified-api` skill's territory. Live per-second BLE or ANT+ streaming is the separate Real-Time SDK, covered by `terra-streaming`. No mobile app of your own? Terra Grip connects these sources for you: see [Terra Grip](https://docs.tryterra.co/mobile-sdks/terra-grip-companion-app).

## The workflow

The shape is the same on every platform; names differ only in casing (`Source.health`, `Source.HEALTH`, `'health'`).

1. **Install and declare native config.** iOS: HealthKit entitlements, background delivery, `Info.plist` keys. Android: every Health Connect permission you read, the privacy-policy screen declared twice, the package query. See the platform reference.
2. **Build one client at launch, with a token provider.** iOS `Terra(devID:tokenProvider:)`, Android `Terra(context, devId = ..., tokenProvider = { ... })` in `Application.onCreate`. React Native and Flutter build the native client at launch from the dev ID in native config (`TerraDevID` in `Info.plist`, `co.tryterra.sdk.DEV_ID` meta-data on Android); JavaScript or Dart then calls `createTerra({ tokenProvider })` once. The SDK calls the token provider **only** when it needs a new link: first link, after a reinstall that lost the stored link, when a different person connects, or after Terra API stops accepting the device's key. A normal launch restores the link with no network call.
3. **Register background sync in the same place, before the first `await`.** iOS `BackgroundSync.register(terra:)`; Android `BackgroundSync.register(context, terra)`. React Native and Flutter do it inside the native bootstrap. Both return `false` when nothing was scheduled, so check the result.
4. **Mint the token on your backend.** `POST https://api.tryterra.co/v2/auth/tokens?reference_id=<your user id>`. The token is single-use and **expires after three minutes**, so mint it inside the token provider, never ahead of time. Authenticate with the `auth:write` data token from "Account tools" (`Authorization: Bearer terra_dt_...`); the `dev-id` and `x-api-key` headers the docs show also work but are the environment's master key. Whatever credential mints tokens stays on your server.
5. **Connect, naming the person.** `connect(source, for: EndUser)` with `.reference(id)` set to the **same** value your backend sends as `reference_id`, or `.anonymous` if it sends none. A stored link is restored only for the person it was made for; a different person signing in on the same phone retires the old link and links again. Terra API still trusts only the reference inside the token. `connect` returns the connection, whose `userID`/`userId` is the `user_id` on your webhooks. To link with a token already in hand (QR code, deep link), pass it to `connect`; that always creates a fresh link.
6. **Request permissions.** `connect` never shows a permission sheet; only `permissions.request` does. Request by category (`read: [.daily, .sleep, .activity, .body]`) or, on 2.3.0 and later, by type (`readTypes`). After the sheet is answered the SDK uploads on its own. There is no sync call.
7. **Check health on every launch.** `diagnostics.state()`: on `linkRevoked`, call `connect` again with the same end user and the token provider links again. `backgroundRefreshUnscheduled` or `BackgroundRestricted` means background sync is not running: the platform reference has the fixes.

Disconnect on the device with `connection.disconnect()` (iOS) or `terra.disconnect(Source.HEALTH)` (Android) or `terra.disconnect()` (React Native, Flutter). To remove the user from Terra API, call `DELETE /auth/deauthenticateUser` from your backend.

## Permissions

- **iOS never reveals whether a read was granted.** `status(for:)` answers `.notDisclosed`, never `.granted` or `.denied`, and React Native and Flutter's `permissions.request` resolve to `undefined`/`null` on iOS. A denied read looks like no data. Write status (`writeStatus(for:)`) is real. On Android, `request` returns what the sheet granted: check it.
- **Heart rate rides the daily upload.** On iOS its permission comes with `body`; on Android it comes with `daily`. Request both if you need heart rate everywhere.
- **Per-type requests (`readTypes`, 2.3.0+) make the install type-scoped, permanently.** From then on the SDK reads and uploads only requested types plus whole categories; later requests add, nothing is dropped. Fields for types you did not request are **left out of the payload, not sent as zero**. A workout keeps its energy, distance and step totals only with `activeEnergy`, `distance` and `steps` requested. `workoutRoute`, `speed`, `power` and `cyclingCadence` need `workouts` (or `activity` whole), else the request throws `workoutsRequired`. Samsung Health is requested by category only. Read [Permissions](https://docs.tryterra.co/reference/mobile-sdks/permissions-mapping) before choosing types.
- **Android categories are wider than their names.** Health Connect's `SLEEP` also reads heart rate, resting heart rate, HRV, oxygen saturation and respiratory rate; replacing it with `SLEEP_ANALYSIS` alone silently stops them.
- **Health Connect grants nothing that is not in your manifest.** 2.x declares no health permission for you. A request for one undeclared type makes Health Connect refuse the whole sheet. Declare exactly what you request (Play rejects unused declarations), plus `READ_HEALTH_DATA_IN_BACKGROUND` for background sync and `READ_HEALTH_DATA_HISTORY` for more than 30 days of history.
- **Apple Health Records are a separate opt-in** (`permissions.requestClinicalRecords()`, iOS, 2.3.0+); `permissions.request` ignores them. Use the `terra-clinical-records` skill if it is installed, else follow [Request Apple Health Records](https://docs.tryterra.co/mobile-sdks/ios-sdk-2#request-apple-health-records).

## What syncs, and when

- **Triggers:** right after a `permissions.request` that adds an upload route, each foreground (at most every 15 minutes), background wakes (HealthKit delivery and the refresh task on iOS; a WorkManager run every 15 minutes at best on Android), and after `connect` creates a new link if access was already requested. `connect` itself uploads nothing.
- **History:** the first sync reaches 730 days back. Health Connect serves only 30 days without `READ_HEALTH_DATA_HISTORY`. To go further, [request historical data](https://docs.tryterra.co/unified-api/requesting-historical-data) from your backend with `to_webhook=true`; the device uploads the window on its next run. The 1.x on-device `getDaily(toWebhook:)` backfill is gone.
- **Only requested, enabled types upload.** A type not enabled for the environment is refused with `data_type_not_enabled`, and the SDK holds that route for up to a day at a time, so enabling it can take a day to show. `terra unified-api data scopes list --env <dev-id>` reads the enabled set. `terra unified-api data scopes replace` takes the **complete** set: every type you leave out is deselected, so read the list first and send it back with your additions.
- **iOS background delivery** needs the `com.apple.developer.healthkit.background-delivery` entitlement (without it, uploads wait for whatever refresh slots iOS grants) and only runs with the phone unlocked and online.
- **No source filtering.** 1.x `setIgnoredSources` does not exist in 2.x; the SDK uploads every app's data the person granted. Deduplicate against other connections on your backend.

## Upgrading from 1.x

Detect the version before writing code. Any of these means 1.x. If the app is on 1.x and the task is to maintain it rather than upgrade it, read `references/sdk-1x.md` and use only that file's calls. Otherwise recommend upgrading with the guide for its platform.

| Platform     | 1.x signs                                                                                                                                                                                  | Upgrade guide                                                                                                                     |
| ------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | --------------------------------------------------------------------------------------------------------------------------------- |
| iOS          | `import TerraiOS`, `Terra.instance(devId:referenceId:)`, `TerraManager`, `initConnection`, `getUserId`, `Terra.setUpBackgroundDelivery()`, `co.tryterra.data.post.request` in `Info.plist` | [iOS upgrade guide](https://docs.tryterra.co/mobile-sdks/ios-migrating-to-2)                                                      |
| Android      | imports from `co.tryterra.terra`, `Terra.instance(...)`, `Connections.HEALTH_CONNECT` or `Connections.SAMSUNG`, the `co.tryterra:android-sdk` artifact                                     | [Android upgrade guide](https://docs.tryterra.co/mobile-sdks/android-migrating-to-2)                                              |
| React Native | the `terra-react` package, `initTerra`, `initConnection`                                                                                                                                   | [React Native upgrade guide](https://docs.tryterra.co/mobile-sdks/react-native-migrating-to-2)                                    |
| Flutter      | `terra_flutter_bridge` 0.x, `TerraFlutter.initTerra`, `TerraFlutter.initConnection`                                                                                                        | none yet: follow the [Flutter SDK guide](https://docs.tryterra.co/mobile-sdks/flutter-sdk-2); its Dart API matches React Native's |

The package names alone do not settle it: the iOS package URL, the `TerraiOS` SwiftPM product name (an alias of `TerraSDK`) and the Maven coordinate `co.tryterra:terra-android` are the same in both majors. Check the imports and calls.

What every upgrade has in common:

- **Keep the same `reference_id`.** It moves from the app (`referenceId:` on `Terra.instance`) to the backend's token request, plus the `EndUser` on every `connect`. The same value keeps existing users on their `user_id`.
- **`initConnection` splits in two:** `connect` (no token argument: the token provider supplies it) then `permissions.request`. `getUserId` becomes `connections` and `connection.userID`. `setUpBackgroundDelivery` and `schedulerOn` become `BackgroundSync.register`. `postActivity` and friends become `log` on the `activity`, `body` and `nutrition` namespaces.
- **Native config changes.** iOS: background task identifier `co.tryterra.sdk.refresh` replaces `co.tryterra.data.post.request`, Background processing mode is no longer needed, minimum iOS 15. Android: the manifest must now declare every Health Connect permission.
- **Never mix majors.** `terra-android` 2.x in an app still on `terra-react` or the 1.x Flutter plugin crashes with missing `co.tryterra.terra` classes. Move the wrapper first.
- **iOS installs with Swift Package Manager only after 2.3.0.** CocoaPods trunk becomes read-only on 2 December 2026, so 2.3.0 is the last `TerraiOS` pod. Existing CocoaPods installs keep working: 1.x and 2.0 to 2.3.0 stay installable from the pod. A later release needs SwiftPM, so move a Podfile integration when you upgrade past 2.3.0.

## Gotchas

- **Build the client once, at launch.** iOS raises an exception and the app stops when a background task is registered after launch finishes, so `BackgroundSync.register` must run before the first `await`. On Android, background runs start the process with no activity, so a client built in a screen does not exist when they arrive.
- **iOS: `NSHealthUpdateUsageDescription` is required even if the app never writes.** App Store Connect rejects the upload without it.
- **Android: name the `tokenProvider` argument.** The factory's last parameter is `stores`, so a trailing lambda binds there and the client has no token provider.
- **Android: create the `PermissionLauncher` in `onCreate`**, before anything that suspends; Android refuses the registration once the activity is started. Flutter's `MainActivity` must extend `FlutterFragmentActivity`, else `bridge.no_activity`.
- **Android 14+: declare the privacy-policy screen twice** (the `ACTION_SHOW_PERMISSIONS_RATIONALE` activity and a `VIEW_PERMISSION_USAGE` activity-alias). Without the alias every read fails with "Incorrect health permission state", granted ones included.
- **Samsung Health: start on Health Connect.** `Source.HEALTH` already reads Samsung data that Samsung Health shares into Health Connect. The direct route (`Source.SAMSUNG_HEALTH`) needs the `terra-android-samsung` add-on, Samsung's own `.aar`, and Samsung partner approval **for your package name and signing certificate**; Terra API's approval does not cover your app. Until approved it only works with Samsung Health developer mode on. React Native and Flutter also need `terraSamsungHealth=true` in `android/gradle.properties`.

## Decisions left to you

- **Categories or types.** Types (2.3.0+) match a narrow consent screen and `NSHealthShareUsageDescription`, but the install stays type-scoped and every payload field needs its type. Default to categories unless the app must disclose exactly what it reads.
- **When to show the sheet.** Nothing prompts until `permissions.request`, so gate it on an explicit user action.
- **Health Connect or Samsung direct** on Android. Default to Health Connect.
- **Your `reference_id` scheme and token endpoint.** The reference is the join key on every webhook.

## Platform references

Read the file for the platform you are building on:

- **`references/ios.md`**: read when integrating the native iOS SDK (`TerraSDK`, Swift): SwiftPM install, entitlements and `Info.plist`, client and background setup, connect and permissions code, your own background task, local reads and writes, diagnostics.
- **`references/android.md`**: read when integrating `terra-android` 2.x (Kotlin): Gradle, the Health Connect manifest, `Application` setup, launcher and permissions code, Samsung add-on, background and OEM restrictions.
- **`references/react-native.md`**: read when integrating `@tryterra/react-native`: iOS bootstrap and Android meta-data, `createTerra`, connect and permissions, error codes.
- **`references/flutter.md`**: read when integrating `terra_flutter_bridge` 2.x: iOS bootstrap, `FlutterFragmentActivity`, `createTerra`, connect and permissions, error codes.
- **`references/sdk-1x.md`**: read only when maintaining an app that stays on 1.x (`TerraiOS` 1.x, `terra-android` 1.x, `terra-react`, `terra_flutter_bridge` 0.x): the 1.x workflow, popup and background-delivery rules, and per-platform setup. Never mix it with the 2.x instructions above.

Full docs: [Mobile SDKs](https://docs.tryterra.co/mobile-sdks/mobile-only-sources), [release notes](https://docs.tryterra.co/mobile-sdks/release-notes), and the SDK references for [iOS](https://docs.tryterra.co/reference/mobile-sdks/ios-sdk-2), [Android](https://docs.tryterra.co/reference/mobile-sdks/android-sdk-2), [React Native](https://docs.tryterra.co/reference/mobile-sdks/react-native-sdk-2) and [Flutter](https://docs.tryterra.co/reference/mobile-sdks/flutter-sdk-2). Where a signature or enum is not shown here, check the reference; do not guess. Ask `terra docs ask` (or `docs_ask` over MCP) before fetching a page: it answers from the docs and cites its sources. Append `.md` to any docs URL for markdown.
